-- =====================================================================
-- RPC identity hardening
--
-- Systemic fix for a security-definer trust gap: these functions run as
-- the function owner (bypassing RLS) and were granted EXECUTE to the
-- `authenticated` role, yet derived identity from caller-supplied UUID
-- arguments (p_user_id / p_buyer_id / p_actor_id / p_reviewer_id) instead
-- of auth.uid(). Any authenticated browser session could call them directly
-- and impersonate another user or an admin.
--
-- 1. Webhook-only settlement RPCs (no user session) are now restricted to
--    the `service_role`, which the payment webhook/callback use.
-- 2. Every other mutating RPC now ties the actor argument to auth.uid(),
--    or checks the admin role against auth.uid().
--
-- Read-only reporting RPCs already used auth.uid() and are untouched.
-- Idempotent (create or replace / revoke + grant).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Webhook-only RPCs: revoke `authenticated`, grant `service_role`.
--    credit_wallet_from_topup / complete_customer_escrow credit money
--    only after Paystack confirms a charge; record_failed_callback is the
--    reconciliation insert. None of them should be reachable from the
--    browser client SDK.
-- ---------------------------------------------------------------------
revoke execute on function public.credit_wallet_from_topup(uuid, numeric, text, text) from authenticated;
grant execute on function public.credit_wallet_from_topup(uuid, numeric, text, text) to service_role;

revoke execute on function public.complete_customer_escrow(text, numeric, text) from authenticated;
grant execute on function public.complete_customer_escrow(text, numeric, text) to service_role;

revoke execute on function public.record_failed_callback(text, jsonb, text, numeric, text) from authenticated;
grant execute on function public.record_failed_callback(text, jsonb, text, numeric, text) to service_role;

-- ---------------------------------------------------------------------
-- 2. B2B escrow funding — buyer must be the caller.
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
  if auth.uid() is distinct from p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

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
-- 3. Milestone release — buyer must be the caller.
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
  if auth.uid() is distinct from p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

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
-- 4. Milestone submission — seller must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.submit_milestone(
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
begin
  if auth.uid() is distinct from p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_milestone from public.milestones where id = p_milestone_id;
  if v_milestone is null then
    return jsonb_build_object('ok', false, 'error', 'Milestone not found');
  end if;
  select * into v_order from public.orders where id = v_milestone.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  select * into v_agency from public.agencies where id = v_order.agency_id;
  if v_agency.owner_id <> p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Only the seller can submit a milestone');
  end if;
  if v_milestone.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Milestone is not submittable');
  end if;
  update public.milestones set status = 'submitted' where id = v_milestone.id;
  update public.orders set status = 'in_progress', updated_at = now() where id = v_order.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Milestone approval — buyer must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.approve_milestone(
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
begin
  if auth.uid() is distinct from p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_milestone from public.milestones where id = p_milestone_id;
  if v_milestone is null then
    return jsonb_build_object('ok', false, 'error', 'Milestone not found');
  end if;
  select * into v_order from public.orders where id = v_milestone.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.buyer_id <> p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Only the buyer can approve a milestone');
  end if;
  if v_milestone.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'Milestone is not submitted');
  end if;
  update public.milestones set status = 'approved' where id = v_milestone.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Withdrawal request — the user must be the caller.
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
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

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

-- ---------------------------------------------------------------------
-- 7. Process withdrawal — admin must be the caller.
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
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

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
    return jsonb_build_object('ok', true, 'status', 'paid');
  elsif p_decision = 'rejected' then
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
-- 8. Resolve dispute — admin must be the caller.
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
  select role into v_role from public.profiles where id = auth.uid();
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

-- ---------------------------------------------------------------------
-- 9. Escalate dispute — admin must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.escalate_dispute(
  p_dispute_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;
  update public.disputes set status = 'under_review' where id = p_dispute_id;
  return jsonb_build_object('ok', true, 'status', 'under_review');
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Refund order escrow — admin must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.refund_order_escrow(
  p_order_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_order public.orders%rowtype;
  v_funded numeric;
  v_released numeric;
  v_remaining numeric;
  v_buyer_wallet uuid;
  v_buyer_escrow numeric;
  v_buyer_available numeric;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_order from public.orders where id = p_order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  select coalesce(sum(amount), 0) into v_funded
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'fund';
  select coalesce(sum(amount), 0) into v_released
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'release';
  v_remaining := v_funded - v_released;

  if v_remaining <= 0 then
    return jsonb_build_object('ok', false, 'error', 'No escrow remaining to refund');
  end if;

  v_buyer_wallet := public.ensure_wallet(v_order.buyer_id);

  select escrow_balance, available_balance into v_buyer_escrow, v_buyer_available
    from public.wallets where id = v_buyer_wallet;
  if v_buyer_escrow < v_remaining then
    return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
  end if;

  v_buyer_escrow    := v_buyer_escrow - v_remaining;
  v_buyer_available := v_buyer_available + v_remaining;
  update public.wallets
     set escrow_balance = v_buyer_escrow, available_balance = v_buyer_available, updated_at = now()
   where id = v_buyer_wallet;

  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_buyer_wallet, v_order.buyer_id, 'refund', v_remaining, v_buyer_available,
    'refund:' || v_order.id::text || ':' || p_actor_id::text
  );
  insert into public.escrow_ledger (
    order_id, actor_id, entry_type, amount, currency, idempotency_key
  ) values (
    v_order.id, p_actor_id, 'refund', v_remaining, v_order.currency,
    'refund:' || v_order.id::text || ':' || p_actor_id::text
  );

  update public.orders set status = 'cancelled', updated_at = now() where id = v_order.id;

  update public.agreements set status = 'refunded', updated_at = now() where order_id = v_order.id;

  return jsonb_build_object('ok', true, 'refunded', v_remaining);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. KYB review — admin must be the caller (previously no role check).
-- ---------------------------------------------------------------------
create or replace function public.review_agency_kyb(
  p_agency_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies%rowtype;
  v_status text;
  v_role text;
  v_other_active integer;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_agency from public.agencies where id = p_agency_id;
  if v_agency is null then
    return jsonb_build_object('ok', false, 'error', 'Agency not found');
  end if;

  if p_decision = 'approved' then
    v_status := 'verified';
    v_role   := 'seller';
  elsif p_decision = 'rejected' then
    v_status := 'rejected';
    v_role   := null;
  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  update public.agencies
     set verification_status = v_status
   where id = p_agency_id;

  update public.kyc_documents
     set status = case when p_decision = 'approved' then 'approved' else 'rejected' end,
         reviewer_note = p_note
   where agency_id = p_agency_id;

  insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
  values ('agency', p_agency_id, p_reviewer_id, p_decision, p_note);

  if p_decision = 'approved' then
    update public.profiles set role = 'seller' where id = v_agency.owner_id;
  else
    select count(*) into v_other_active
      from public.agencies
     where owner_id = v_agency.owner_id and verification_status = 'verified';
    if v_other_active = 0 then
      update public.profiles set role = 'buyer' where id = v_agency.owner_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

-- ---------------------------------------------------------------------
-- 12. Service review — admin must be the caller (previously no role check).
-- ---------------------------------------------------------------------
create or replace function public.review_service(
  p_service_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_status text;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_service from public.services where id = p_service_id;
  if v_service is null then
    return jsonb_build_object('ok', false, 'error', 'Service not found');
  end if;

  if p_decision = 'approved' then
    v_status := 'published';
  elsif p_decision = 'rejected' then
    v_status := 'rejected';
  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  update public.services set status = v_status, updated_at = now() where id = p_service_id;

  insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
  values ('service', p_service_id, p_reviewer_id, p_decision, p_note);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

-- ---------------------------------------------------------------------
-- 13. Verification submission review — admin must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.review_verification_submission(
  p_submission_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_rejection_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.verification_submissions%rowtype;
  v_agency public.agencies%rowtype;
  v_role text;
  v_creds text[];
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_sub from public.verification_submissions where id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('ok', false, 'error', 'Submission not found');
  end if;
  if v_sub.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Submission already reviewed');
  end if;
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  select * into v_agency from public.agencies where id = v_sub.agency_id;

  if p_decision = 'rejected' then
    update public.verification_submissions
       set status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = now(),
           rejection_reason = p_rejection_reason, updated_at = now()
     where id = p_submission_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  v_creds := coalesce(v_agency.verifications, '{}'::text[]);

  if v_sub.type = 'kyb' then
    update public.agencies set verification_status = 'verified' where id = v_sub.agency_id;
    update public.profiles set role = 'seller' where id = v_agency.owner_id;
    if not ('cac' = any(v_creds)) then v_creds := v_creds || 'cac'; end if;
  elsif v_sub.type = 'nanta' then
    if not ('nanta' = any(v_creds)) then v_creds := v_creds || 'nanta'; end if;
  elsif v_sub.type = 'iata' then
    if not ('iata' = any(v_creds)) then v_creds := v_creds || 'iata'; end if;
  end if;

  update public.agencies set verifications = v_creds where id = v_sub.agency_id;

  update public.verification_submissions
     set status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now(), updated_at = now()
   where id = p_submission_id;

  return jsonb_build_object('ok', true, 'status', 'approved');
end;
$$;

-- ---------------------------------------------------------------------
-- 14. Set agency credentials — admin must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_agency_credentials(
  p_agency_id uuid,
  p_credentials text[],
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;
  update public.agencies
     set verifications = coalesce(p_credentials, '{}'::text[])
   where id = p_agency_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 15. Resolve failed callback — admin must be the caller.
-- ---------------------------------------------------------------------
create or replace function public.admin_resolve_failed_callback(
  p_callback_id uuid,
  p_status text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;
  if p_status not in ('resolved','ignored') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status');
  end if;
  update public.failed_payment_callbacks
     set status = p_status, updated_at = now()
   where id = p_callback_id;
  return jsonb_build_object('ok', true);
end;
$$;