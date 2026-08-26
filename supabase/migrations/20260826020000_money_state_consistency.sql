-- ---------------------------------------------------------------------
-- Money-state consistency pass
-- 1. Prune the dead milestone 'funded' state. Nothing ever sets a milestone
--    to 'funded' (escrow funding updates orders.status, not the milestone
--    row), so the check constraint and submit_milestone guard are trimmed to
--    the states that actually exist: pending, submitted, approved, released.
-- 2. refund_order_escrow now filters deleted_at is null on the order lookup,
--    matching every sibling money RPC that got the soft-delete hardening pass.
-- ---------------------------------------------------------------------

-- 1. Milestones: drop the 'funded' status.
alter table public.milestones drop constraint if exists milestones_status_check;
alter table public.milestones add constraint milestones_status_check
  check (status in ('pending', 'submitted', 'approved', 'released'));

-- Recreate submit_milestone without the 'funded' branch.
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

-- 2. Refund settlement: honor soft-delete on the order lookup.
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
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_order from public.orders where id = p_order_id and deleted_at is null;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  -- Remaining escrow = funded - released.
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

  -- Mark any agreement refunded.
  update public.agreements set status = 'refunded', updated_at = now() where order_id = v_order.id;

  return jsonb_build_object('ok', true, 'refunded', v_remaining);
end;
$$;