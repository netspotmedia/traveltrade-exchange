-- =====================================================================
-- TTX Withdrawal Encryption Key Guard
-- Re-creates request_withdrawal to refuse to operate when the wallet
-- encryption key is still the insecure default placeholder. This forces
-- operators to configure a strong key before withdrawals can be created.
--
-- To configure in production:
--   update public.platform_config
--      set value = '<64+ char random hex>'
--    where key = 'wallet_encryption_key';
--
-- Idempotent (create or replace).
-- =====================================================================

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
  -- Refuse the insecure default placeholder shipped in the withdrawal migration.
  if v_enc_key = 'ttx-default-change-me' then
    return jsonb_build_object('ok', false, 'error', 'Wallet encryption key is still the insecure default; configure a strong key in platform_config before processing withdrawals');
  end if;

  v_wallet_id := public.ensure_wallet(p_user_id);
  select available_balance into v_balance from public.wallets where id = v_wallet_id and deleted_at is null;
  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available balance');
  end if;

  v_ref := 'wd_' || gen_random_uuid();
  v_hash := encode(digest(p_account_number, 'sha256'), 'hex');
  v_balance := v_balance - p_amount;

  update public.wallets set available_balance = v_balance, updated_at = now() where id = v_wallet_id and deleted_at is null;

  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
  values (v_wallet_id, p_user_id, 'withdrawal', p_amount, v_balance, 'withdrawal:' || v_ref);

  insert into public.withdrawals (seller_id, amount, currency, status, reference, bank_name, account_name, account_number_hash, account_number_encrypted)
  values (p_user_id, p_amount, 'NGN', 'pending', v_ref, p_bank_name, p_account_name, v_hash, encode(pgp_sym_encrypt(p_account_number, v_enc_key), 'hex'))
  returning id into v_withdrawal_id;

  return jsonb_build_object('ok', true, 'withdrawal_id', v_withdrawal_id, 'reference', v_ref);
end;
$$;

grant execute on function public.request_withdrawal(uuid, numeric, text, text, text) to authenticated;