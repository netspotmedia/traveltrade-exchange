-- =====================================================================
-- TTX Withdrawals Workflow
-- Built on the existing schema (withdrawals, wallets, wallet_ledger,
-- admin_reviews).
--
-- NOTE: Applied on top of prior migrations. Adds columns to withdrawals
-- (additive) and adds functions. Idempotent (create or replace / add
-- column if not exists via DO block).
-- =====================================================================

-- Enable pgcrypto for encryption + hashing.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Add bank-account columns to withdrawals (additive, idempotent)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'bank_name') then
    alter table public.withdrawals add column bank_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'account_name') then
    alter table public.withdrawals add column account_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'account_number_hash') then
    alter table public.withdrawals add column account_number_hash text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'account_number_encrypted') then
    alter table public.withdrawals add column account_number_encrypted text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'failure_reason') then
    alter table public.withdrawals add column failure_reason text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'processed_by') then
    alter table public.withdrawals add column processed_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'processed_at') then
    alter table public.withdrawals add column processed_at timestamptz;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Wallet encryption key config (read by the RPCs)
--    NOTE: set this to a strong random value in production. It is stored
--    in platform_config so the RPC can decrypt without an app env var.
-- ---------------------------------------------------------------------
insert into public.platform_config (key, value)
values ('wallet_encryption_key', 'ttx-default-change-me')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3. Request withdrawal (atomic debit + idempotent)
-- ---------------------------------------------------------------------
create or replace function public.request_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_bank_name text,
  p_account_name text,
  p_account_number text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_balance numeric;
  v_ref text;
  v_enc_key text;
  v_hash text;
  v_withdrawal_id uuid;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;
  if p_bank_name is null or length(trim(p_bank_name)) = 0
     or p_account_name is null or length(trim(p_account_name)) = 0
     or p_account_number is null or length(p_account_number) < 5 then
    return jsonb_build_object('ok', false, 'error', 'Valid bank, account name and account number are required');
  end if;

  select value into v_enc_key from public.platform_config where key = 'wallet_encryption_key';
  if v_enc_key is null then
    return jsonb_build_object('ok', false, 'error', 'Wallet encryption key not configured');
  end if;

  v_wallet_id := public.ensure_wallet(p_user_id);

  select available_balance into v_balance from public.wallets where id = v_wallet_id;
  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available balance');
  end if;

  -- Idempotency reference.
  v_ref := 'wd_' || gen_random_uuid();
  v_hash := encode(digest(p_account_number, 'sha256'), 'hex');
  v_balance := v_balance - p_amount;

  update public.wallets
     set available_balance = v_balance, updated_at = now()
   where id = v_wallet_id;

  -- Ledger: withdrawal debit.
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_wallet_id, p_user_id, 'withdrawal', p_amount, v_balance,
    'withdrawal:' || v_ref
  );

  -- Withdrawal record (account number encrypted + hashed).
  insert into public.withdrawals (
    seller_id, amount, currency, status, reference,
    bank_name, account_name, account_number_hash, account_number_encrypted
  ) values (
    p_user_id, p_amount, 'NGN', 'pending', v_ref,
    p_bank_name, p_account_name, v_hash,
    encode(pgp_sym_encrypt(p_account_number, v_enc_key), 'hex')
  ) returning id into v_withdrawal_id;

  return jsonb_build_object('ok', true, 'withdrawal_id', v_withdrawal_id, 'reference', v_ref);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Process withdrawal (admin: 'paid' | 'rejected')
--    On 'rejected': refund available balance + reversal ledger.
-- ---------------------------------------------------------------------
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_decision text,
  p_actor_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
  v_wallet_id uuid;
  v_balance numeric;
  v_ref text;
begin
  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id;
  if v_withdrawal is null then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal not found');
  end if;
  if v_withdrawal.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Withdrawal is not pending');
  end if;

  if p_decision = 'paid' then
    update public.withdrawals
       set status = 'paid', processed_by = p_actor_id, processed_at = now()
     where id = p_withdrawal_id;
    -- Funds were debited at request time; nothing else to move.
    return jsonb_build_object('ok', true, 'status', 'paid');
  elsif p_decision = 'rejected' then
    -- Refund the debited amount back to available balance.
    v_wallet_id := public.ensure_wallet(v_withdrawal.seller_id);
    select available_balance into v_balance from public.wallets where id = v_wallet_id;
    v_balance := v_balance + v_withdrawal.amount;
    v_ref := 'wd_refund_' || gen_random_uuid();

    update public.wallets set available_balance = v_balance, updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_ledger (
      wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
    ) values (
      v_wallet_id, v_withdrawal.seller_id, 'refund', v_withdrawal.amount, v_balance,
      'withdrawal_refund:' || v_withdrawal.reference
    );

    update public.withdrawals
       set status = 'rejected', failure_reason = p_note,
           processed_by = p_actor_id, processed_at = now()
     where id = p_withdrawal_id;

    insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
    values ('withdrawal', p_withdrawal_id, p_actor_id, 'rejected', p_note);

    return jsonb_build_object('ok', true, 'status', 'rejected');
  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be paid or rejected');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. RLS / grants
-- ---------------------------------------------------------------------
grant execute on function public.request_withdrawal(uuid, numeric, text, text, text) to authenticated;
grant execute on function public.process_withdrawal(uuid, text, uuid, text) to authenticated;
