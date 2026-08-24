-- =====================================================================
-- TTX Money RPC Soft-Delete Hardening
-- Re-creates the financial RPCs so their ledger/wallet reads filter
-- deleted_at IS NULL, preventing soft-deleted rows from being double
-- counted in balances, idempotency checks, or release guards.
--
-- NOTE: Applied on top of prior migrations. Idempotent (create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Top-up crediting (idempotency check filters soft-deleted rows)
-- ---------------------------------------------------------------------
create or replace function public.credit_wallet_from_topup(
  p_user_id uuid,
  p_amount numeric,
  p_provider_reference text,
  p_currency text default 'NGN'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_new_balance numeric;
  v_idem text := 'topup:' || coalesce(p_provider_reference, '');
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;

  v_wallet_id := public.ensure_wallet(p_user_id);

  if exists (
    select 1 from public.wallet_ledger
    where idempotency_key = v_idem and deleted_at is null
  ) then
    return jsonb_build_object('ok', true, 'already_processed', true, 'wallet_id', v_wallet_id);
  end if;

  update public.wallets
     set available_balance = available_balance + p_amount, updated_at = now()
   where id = v_wallet_id and deleted_at is null
  returning available_balance into v_new_balance;

  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, provider_reference, idempotency_key
  ) values (
    v_wallet_id, p_user_id, 'top_up', p_amount, v_new_balance, p_provider_reference, v_idem
  );

  return jsonb_build_object('ok', true, 'wallet_id', v_wallet_id, 'balance_after', v_new_balance);
end;
$$;

-- ---------------------------------------------------------------------
-- 2. B2B escrow funding
-- ---------------------------------------------------------------------
create or replace function public.fund_escrow_from_wallet(
  p_order_id uuid,
  p_buyer_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_wallet_id uuid;
  v_new_available numeric;
  v_new_escrow numeric;
  v_idem text := 'fund:' || p_order_id::text;
begin
  select * into v_order from public.orders where id = p_order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.buyer_id <> p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Not the order buyer');
  end if;
  if v_order.status not in ('proposed') then
    return jsonb_build_object('ok', false, 'error', 'Order cannot be funded from status ' || v_order.status);
  end if;

  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem and deleted_at is null) then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  v_wallet_id := public.ensure_wallet(p_buyer_id);

  select available_balance, escrow_balance into v_new_available, v_new_escrow
    from public.wallets where id = v_wallet_id and deleted_at is null;

  if v_new_available < v_order.total_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient wallet balance');
  end if;

  v_new_available := v_new_available - v_order.total_amount;
  v_new_escrow     := v_new_escrow     + v_order.total_amount;

  update public.wallets
     set available_balance = v_new_available, escrow_balance = v_new_escrow, updated_at = now()
   where id = v_wallet_id and deleted_at is null;

  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
  values (v_wallet_id, p_buyer_id, 'escrow_hold', v_order.total_amount, v_new_available, 'hold:' || v_order.id::text);

  insert into public.escrow_ledger (order_id, actor_id, entry_type, amount, currency, idempotency_key)
  values (v_order.id, p_buyer_id, 'fund', v_order.total_amount, v_order.currency, v_idem);

  update public.orders set status = 'funded', updated_at = now() where id = v_order.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. B2C escrow funding
-- ---------------------------------------------------------------------
create or replace function public.complete_customer_escrow(
  p_reference text,
  p_amount numeric,
  p_currency text default 'NGN'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.customer_escrow_payments%rowtype;
  v_order public.orders%rowtype;
  v_idem text := 'fund:' || p_reference;
  v_wallet_id uuid;
  v_new_escrow numeric;
  v_available numeric;
begin
  select * into v_payment from public.customer_escrow_payments where reference = p_reference and deleted_at is null;
  if v_payment is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown payment reference');
  end if;
  if v_payment.status = 'funded' then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;
  if p_amount <> v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Amount mismatch');
  end if;

  select * into v_order from public.orders where id = v_payment.order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem and deleted_at is null) then
    update public.customer_escrow_payments set status = 'funded', updated_at = now() where id = v_payment.id;
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  v_wallet_id := public.ensure_wallet(v_payment.user_id);
  select available_balance, escrow_balance into v_available, v_new_escrow
    from public.wallets where id = v_wallet_id and deleted_at is null;
  v_new_escrow := v_new_escrow + v_payment.amount;

  update public.wallets set escrow_balance = v_new_escrow, updated_at = now()
   where id = v_wallet_id and deleted_at is null;

  insert into public.escrow_ledger (order_id, actor_id, entry_type, amount, currency, idempotency_key)
  values (v_order.id, v_payment.user_id, 'fund', v_payment.amount, p_currency, v_idem);

  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, provider_reference, idempotency_key)
  values (v_wallet_id, v_payment.user_id, 'escrow_hold', v_payment.amount, v_new_escrow, p_reference, 'hold:' || p_reference);

  update public.orders set status = 'funded', updated_at = now() where id = v_order.id;
  update public.customer_escrow_payments set status = 'funded', paystack_ref = p_reference, updated_at = now() where id = v_payment.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Milestone release (over-release guard filters soft-deleted rows)
-- ---------------------------------------------------------------------
create or replace function public.release_milestone(
  p_milestone_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_milestone public.milestones%rowtype;
  v_order public.orders%rowtype;
  v_agency public.agencies%rowtype;
  v_seller_wallet uuid;
  v_buyer_wallet uuid;
  v_fee_wallet uuid;
  v_fee_rate numeric;
  v_fee_user_id uuid;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  v_buyer_escrow numeric;
  v_seller_balance numeric;
  v_fee_balance numeric;
  v_sum_released numeric;
  v_idem text := 'release:' || p_milestone_id::text;
begin
  select * into v_milestone from public.milestones where id = p_milestone_id and deleted_at is null;
  if v_milestone is null then
    return jsonb_build_object('ok', false, 'error', 'Milestone not found');
  end if;
  select * into v_order from public.orders where id = v_milestone.order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.buyer_id <> p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Only the buyer can release a milestone');
  end if;
  if v_milestone.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Milestone is not approved');
  end if;
  if v_order.status not in ('funded', 'in_progress') then
    return jsonb_build_object('ok', false, 'error', 'Order is not active');
  end if;
  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem and deleted_at is null) then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  select value::numeric into v_fee_rate from public.platform_config where key = 'platform_fee_rate';
  if v_fee_rate is null then v_fee_rate := 0.08; end if;
  select value::uuid into v_fee_user_id from public.platform_config where key = 'fee_wallet_user_id';
  if v_fee_user_id is null then v_fee_user_id := '00000000-0000-0000-0000-000000000000'::uuid; end if;

  select coalesce(sum(amount), 0) into v_sum_released
    from public.escrow_ledger
   where order_id = v_order.id and entry_type = 'release' and deleted_at is null;

  if v_sum_released + v_milestone.amount > v_order.total_amount then
    return jsonb_build_object('ok', false, 'error', 'Release would exceed funded amount');
  end if;

  v_gross := v_milestone.amount;
  v_fee   := round(v_gross * v_fee_rate, 2);
  v_net   := v_gross - v_fee;

  select * into v_agency from public.agencies where id = v_order.agency_id and deleted_at is null;
  v_seller_wallet := public.ensure_wallet(v_agency.owner_id);
  v_buyer_wallet  := public.ensure_wallet(v_order.buyer_id);
  v_fee_wallet    := public.ensure_wallet(v_fee_user_id);

  select escrow_balance into v_buyer_escrow from public.wallets where id = v_buyer_wallet and deleted_at is null;
  if v_buyer_escrow < v_gross then
    return jsonb_build_object('ok', false, 'error', 'Insufficient escrow balance');
  end if;
  v_buyer_escrow := v_buyer_escrow - v_gross;
  update public.wallets set escrow_balance = v_buyer_escrow, updated_at = now() where id = v_buyer_wallet;

  select available_balance into v_seller_balance from public.wallets where id = v_seller_wallet and deleted_at is null;
  v_seller_balance := v_seller_balance + v_net;
  update public.wallets set available_balance = v_seller_balance, updated_at = now() where id = v_seller_wallet;

  select available_balance into v_fee_balance from public.wallets where id = v_fee_wallet and deleted_at is null;
  v_fee_balance := v_fee_balance + v_fee;
  update public.wallets set available_balance = v_fee_balance, updated_at = now() where id = v_fee_wallet;

  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
  values (v_buyer_wallet, v_order.buyer_id, 'escrow_release', v_gross, v_buyer_escrow, 'buyer_release:' || v_milestone.id::text);
  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
  values (v_seller_wallet, v_agency.owner_id, 'escrow_release', v_net, v_seller_balance, 'seller_release:' || v_milestone.id::text);
  insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
  values (v_fee_wallet, v_agency.owner_id, 'fee', v_fee, v_fee_balance, 'fee:' || v_milestone.id::text);

  insert into public.escrow_ledger (order_id, milestone_id, actor_id, entry_type, amount, currency, idempotency_key)
  values (v_order.id, v_milestone.id, v_order.buyer_id, 'release', v_gross, v_order.currency, v_idem);

  update public.milestones set status = 'released', due_at = coalesce(due_at, now()) where id = v_milestone.id;

  if not exists (
    select 1 from public.milestones where order_id = v_order.id and status <> 'released' and deleted_at is null
  ) then
    update public.orders set status = 'completed', updated_at = now() where id = v_order.id;
    update public.agencies set completed_orders = completed_orders + 1 where id = v_order.agency_id;
  end if;

  return jsonb_build_object('ok', true, 'gross', v_gross, 'fee', v_fee, 'net', v_net);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Withdrawal request (balance read filters soft-deleted rows)
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

-- ---------------------------------------------------------------------
-- 6. Dispute resolution (escrow sums filter soft-deleted rows)
-- ---------------------------------------------------------------------
create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_actor_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.disputes%rowtype;
  v_order public.orders%rowtype;
  v_role text;
  v_agency public.agencies%rowtype;
  v_funded numeric;
  v_released numeric;
  v_remaining numeric;
  v_fee_rate numeric;
  v_fee numeric;
  v_net numeric;
  v_fee_user_id uuid;
  v_buyer_wallet uuid;
  v_seller_wallet uuid;
  v_fee_wallet uuid;
  v_buyer_available numeric;
  v_seller_balance numeric;
  v_fee_balance numeric;
  v_buyer_escrow numeric;
begin
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id and deleted_at is null;
  if v_dispute is null then
    return jsonb_build_object('ok', false, 'error', 'Dispute not found');
  end if;
  if v_dispute.status in ('resolved_buyer', 'resolved_seller', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'Dispute is already resolved');
  end if;

  select * into v_order from public.orders where id = v_dispute.order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  select coalesce(sum(amount), 0) into v_funded
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'fund' and deleted_at is null;
  select coalesce(sum(amount), 0) into v_released
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'release' and deleted_at is null;
  v_remaining := v_funded - v_released;

  v_buyer_wallet := public.ensure_wallet(v_order.buyer_id);
  select * into v_agency from public.agencies where id = v_order.agency_id and deleted_at is null;

  if p_decision = 'resolved_buyer' then
    select escrow_balance, available_balance into v_buyer_escrow, v_buyer_available
      from public.wallets where id = v_buyer_wallet and deleted_at is null;
    if v_buyer_escrow < v_remaining then
      return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
    end if;
    v_buyer_escrow   := v_buyer_escrow - v_remaining;
    v_buyer_available := v_buyer_available + v_remaining;
    update public.wallets set escrow_balance = v_buyer_escrow, available_balance = v_buyer_available, updated_at = now()
     where id = v_buyer_wallet;

    insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
    values (v_buyer_wallet, v_order.buyer_id, 'refund', v_remaining, v_buyer_available, 'dispute_refund:' || v_dispute.id::text);
    insert into public.escrow_ledger (order_id, actor_id, entry_type, amount, currency, idempotency_key)
    values (v_order.id, v_order.buyer_id, 'refund', v_remaining, v_order.currency, 'dispute_refund:' || v_dispute.id::text);

    update public.orders set status = 'cancelled', updated_at = now() where id = v_order.id;
    update public.disputes set status = 'resolved_buyer', resolution_note = p_note, resolved_at = now() where id = v_dispute.id;
    insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
    values ('dispute', v_dispute.id, p_actor_id, 'resolved', p_note);
    return jsonb_build_object('ok', true, 'status', 'resolved_buyer', 'refunded', v_remaining);

  elsif p_decision = 'resolved_seller' then
    select value::numeric into v_fee_rate from public.platform_config where key = 'platform_fee_rate';
    if v_fee_rate is null then v_fee_rate := 0.08; end if;
    select value::uuid into v_fee_user_id from public.platform_config where key = 'fee_wallet_user_id';
    if v_fee_user_id is null then v_fee_user_id := '00000000-0000-0000-0000-000000000000'::uuid; end if;

    v_fee := round(v_remaining * v_fee_rate, 2);
    v_net := v_remaining - v_fee;

    v_seller_wallet := public.ensure_wallet(v_agency.owner_id);
    v_fee_wallet    := public.ensure_wallet(v_fee_user_id);

    select escrow_balance into v_buyer_escrow from public.wallets where id = v_buyer_wallet and deleted_at is null;
    v_buyer_escrow := v_buyer_escrow - v_remaining;
    update public.wallets set escrow_balance = v_buyer_escrow, updated_at = now() where id = v_buyer_wallet;

    select available_balance into v_seller_balance from public.wallets where id = v_seller_wallet and deleted_at is null;
    v_seller_balance := v_seller_balance + v_net;
    update public.wallets set available_balance = v_seller_balance, updated_at = now() where id = v_seller_wallet;

    select available_balance into v_fee_balance from public.wallets where id = v_fee_wallet and deleted_at is null;
    v_fee_balance := v_fee_balance + v_fee;
    update public.wallets set available_balance = v_fee_balance, updated_at = now() where id = v_fee_wallet;

    insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
    values (v_seller_wallet, v_agency.owner_id, 'escrow_release', v_net, v_seller_balance, 'dispute_seller:' || v_dispute.id::text);
    insert into public.wallet_ledger (wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key)
    values (v_fee_wallet, v_agency.owner_id, 'fee', v_fee, v_fee_balance, 'dispute_fee:' || v_dispute.id::text);
    insert into public.escrow_ledger (order_id, milestone_id, actor_id, entry_type, amount, currency, idempotency_key)
    values (v_order.id, null, v_order.buyer_id, 'release', v_remaining, v_order.currency, 'dispute_release:' || v_dispute.id::text);

    update public.orders set status = 'completed', updated_at = now() where id = v_order.id;
    update public.agencies set completed_orders = completed_orders + 1 where id = v_order.agency_id;
    update public.disputes set status = 'resolved_seller', resolution_note = p_note, resolved_at = now() where id = v_dispute.id;
    insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
    values ('dispute', v_dispute.id, p_actor_id, 'resolved', p_note);
    return jsonb_build_object('ok', true, 'status', 'resolved_seller', 'released', v_net);

  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be resolved_buyer or resolved_seller');
  end if;
end;
$$;
