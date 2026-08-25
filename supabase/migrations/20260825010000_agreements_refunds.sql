-- =====================================================================
-- TTX Agreements & Refund Requests
-- Adds a digital-agreement/signature layer on top of orders + escrow and a
-- refund-request workflow for buyers. Adopts the TTX Next agreement model
-- (signature timestamps per party, active/completed/refunded status) onto
-- the existing orders/milestones/escrow system.
--
-- SAFETY: Additive only. create table if not exists, create or replace
-- function, drop policy if exists + create. Does not modify existing
-- tables or the existing escrow/milestone RPCs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. agreements — one per order, created when a proposal is accepted.
--    signed_by_buyer_at is set on acceptance; signed_by_seller_at is set
--    when the agency owner signs from the order page. An order becomes
--    fundable once both parties have signed (existing orders without an
--    agreement row remain fundable, preserving the legacy flow).
-- ---------------------------------------------------------------------
create table if not exists public.agreements (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null unique references public.orders (id) on delete cascade,
  proposal_id          uuid references public.proposals (id) on delete set null,
  total_amount         numeric not null check (total_amount >= 0),
  currency             text not null default 'NGN',
  status               text not null default 'pending_signatures' check (status in ('pending_signatures','active','completed','cancelled','refunded')),
  signed_by_buyer_at   timestamptz,
  signed_by_seller_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists agreements_order_idx on public.agreements (order_id);

-- ---------------------------------------------------------------------
-- 2. refund_requests — buyer-initiated refund of escrowed funds, reviewed
--    by an admin. Approved refunds settle via refund_order_escrow().
-- ---------------------------------------------------------------------
create table if not exists public.refund_requests (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  requester_id     uuid not null references public.profiles (id) on delete cascade,
  amount           numeric not null check (amount > 0),
  reason           text,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists refund_requests_order_idx on public.refund_requests (order_id);
create index if not exists refund_requests_status_idx on public.refund_requests (status);

-- ---------------------------------------------------------------------
-- 3. Refund settlement — refund remaining escrow (funded - released) to the
--    buyer's available balance, then cancel the order. Admin only.
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
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_order from public.orders where id = p_order_id;
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

-- ---------------------------------------------------------------------
-- 4. RLS — participants read/update their agreement; refund requester reads
--    own, admins read/update all; inserts happen server-side.
-- ---------------------------------------------------------------------
alter table public.agreements enable row level security;
alter table public.refund_requests enable row level security;

drop policy if exists agreements_participant_select on public.agreements;
create policy agreements_participant_select on public.agreements
  for select
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
    union
    select id from public.profiles where role = 'admin'
  ));

drop policy if exists agreements_participant_update on public.agreements;
create policy agreements_participant_update on public.agreements
  for update
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

-- The buyer creates the agreement when accepting a proposal.
drop policy if exists agreements_buyer_insert on public.agreements;
create policy agreements_buyer_insert on public.agreements
  for insert
  with check (auth.uid() in (
    select buyer_id from public.orders where id = order_id
  ));

drop policy if exists refund_requests_select on public.refund_requests;
create policy refund_requests_select on public.refund_requests
  for select
  using (auth.uid() = requester_id or auth.uid() in (
    select id from public.profiles where role = 'admin'
  ));

drop policy if exists refund_requests_buyer_insert on public.refund_requests;
create policy refund_requests_buyer_insert on public.refund_requests
  for insert
  with check (auth.uid() = requester_id and auth.uid() in (
    select buyer_id from public.orders where id = order_id
  ));

drop policy if exists refund_requests_admin_update on public.refund_requests;
create policy refund_requests_admin_update on public.refund_requests
  for update
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

grant select, insert, update on public.agreements to authenticated;
grant select, insert on public.refund_requests to authenticated;
grant update on public.refund_requests to authenticated;
grant execute on function public.refund_order_escrow(uuid, uuid) to authenticated;