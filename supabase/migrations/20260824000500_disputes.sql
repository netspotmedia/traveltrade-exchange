-- =====================================================================
-- TTX Disputes & Refunds
-- Built on the existing schema (disputes, orders, escrow_ledger,
-- wallets, wallet_ledger, agencies, milestones, admin_reviews).
--
-- NOTE: Applied on top of prior migrations. Only ADDS functions.
-- Idempotent (create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Resolve a dispute (admin)
--    decision: 'resolved_buyer' | 'resolved_seller'
--
--    resolved_buyer  -> refund remaining escrow to the buyer's wallet,
--                       escrow_ledger 'refund', order -> cancelled,
--                       dispute -> resolved_buyer.
--    resolved_seller -> release remaining escrow to the seller (net - fee),
--                       fee to fee wallet, order -> completed,
--                       dispute -> resolved_seller.
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
  -- Admin check (defense-in-depth).
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    return jsonb_build_object('ok', false, 'error', 'Dispute not found');
  end if;
  if v_dispute.status in ('resolved_buyer', 'resolved_seller', 'closed') then
    return jsonb_build_object('ok', false, 'error', 'Dispute is already resolved');
  end if;

  select * into v_order from public.orders where id = v_dispute.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  -- Remaining escrow = funded - released.
  select coalesce(sum(amount), 0) into v_funded
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'fund';
  select coalesce(sum(amount), 0) into v_released
    from public.escrow_ledger where order_id = v_order.id and entry_type = 'release';
  v_remaining := v_funded - v_released;

  v_buyer_wallet := public.ensure_wallet(v_order.buyer_id);
  select * into v_agency from public.agencies where id = v_order.agency_id;

  if p_decision = 'resolved_buyer' then
    -- Refund remaining escrow to buyer available balance.
    select escrow_balance, available_balance into v_buyer_escrow, v_buyer_available
      from public.wallets where id = v_buyer_wallet;
    if v_buyer_escrow < v_remaining then
      return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
    end if;
    v_buyer_escrow   := v_buyer_escrow - v_remaining;
    v_buyer_available := v_buyer_available + v_remaining;
    update public.wallets
       set escrow_balance = v_buyer_escrow, available_balance = v_buyer_available, updated_at = now()
     where id = v_buyer_wallet;

    insert into public.wallet_ledger (
      wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
    ) values (
      v_buyer_wallet, v_order.buyer_id, 'refund', v_remaining, v_buyer_available,
      'dispute_refund:' || v_dispute.id::text
    );
    insert into public.escrow_ledger (
      order_id, actor_id, entry_type, amount, currency, idempotency_key
    ) values (
      v_order.id, v_order.buyer_id, 'refund', v_remaining, v_order.currency,
      'dispute_refund:' || v_dispute.id::text
    );

    update public.orders set status = 'cancelled', updated_at = now() where id = v_order.id;
    update public.disputes set status = 'resolved_buyer', resolution_note = p_note, resolved_at = now()
     where id = v_dispute.id;
    insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
    values ('dispute', v_dispute.id, p_actor_id, 'resolved', p_note);

    return jsonb_build_object('ok', true, 'status', 'resolved_buyer', 'refunded', v_remaining);

  elsif p_decision = 'resolved_seller' then
    -- Release remaining escrow to seller (net - fee).
    select value::numeric into v_fee_rate from public.platform_config where key = 'platform_fee_rate';
    if v_fee_rate is null then v_fee_rate := 0.08; end if;
    select value::uuid into v_fee_user_id from public.platform_config where key = 'fee_wallet_user_id';
    if v_fee_user_id is null then v_fee_user_id := '00000000-0000-0000-0000-000000000000'::uuid; end if;

    v_fee := round(v_remaining * v_fee_rate, 2);
    v_net := v_remaining - v_fee;

    v_seller_wallet := public.ensure_wallet(v_agency.owner_id);
    v_fee_wallet    := public.ensure_wallet(v_fee_user_id);

    select escrow_balance into v_buyer_escrow from public.wallets where id = v_buyer_wallet;
    v_buyer_escrow := v_buyer_escrow - v_remaining;
    update public.wallets set escrow_balance = v_buyer_escrow, updated_at = now() where id = v_buyer_wallet;

    select available_balance into v_seller_balance from public.wallets where id = v_seller_wallet;
    v_seller_balance := v_seller_balance + v_net;
    update public.wallets set available_balance = v_seller_balance, updated_at = now() where id = v_seller_wallet;

    select available_balance into v_fee_balance from public.wallets where id = v_fee_wallet;
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
    update public.disputes set status = 'resolved_seller', resolution_note = p_note, resolved_at = now()
     where id = v_dispute.id;
    insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
    values ('dispute', v_dispute.id, p_actor_id, 'resolved', p_note);

    return jsonb_build_object('ok', true, 'status', 'resolved_seller', 'released', v_net);

  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be resolved_buyer or resolved_seller');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Escalate a dispute to under_review (admin marks as under review).
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
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;
  update public.disputes set status = 'under_review' where id = p_dispute_id;
  return jsonb_build_object('ok', true, 'status', 'under_review');
end;
$$;

grant execute on function public.resolve_dispute(uuid, text, uuid, text) to authenticated;
grant execute on function public.escalate_dispute(uuid, uuid) to authenticated;
