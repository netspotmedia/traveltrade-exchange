-- =====================================================================
-- TTX Money Engine
-- Atomic, idempotent wallet / escrow / milestone settlement.
-- Built on the existing schema (wallets, wallet_ledger, escrow_ledger,
-- orders, milestones, profiles, agencies).
--
-- Idempotency strategy: every financial side-effect inserts into a table
-- with a UNIQUE idempotency key. Replayed webhooks / retries fail the
-- insert, so funds are never double-credited.
--
-- NOTE: This migration is applied on top of the existing schema dump.
-- It only ADDS objects; it does not modify existing tables/columns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Platform configuration
-- ---------------------------------------------------------------------
create table if not exists public.platform_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Platform fee rate expressed as a fraction of 1 (0.08 == 8%).
-- Applied to each released milestone.
insert into public.platform_config (key, value)
values ('platform_fee_rate', '0.08')
on conflict (key) do nothing;

-- Sentinel user id that owns the platform fee wallet. All-zeros UUID.
insert into public.platform_config (key, value)
values ('fee_wallet_user_id', '00000000-0000-0000-0000-000000000000')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. B2C card-funded escrow payment tracking
--    Maps a Paystack reference to an order so the charge.success webhook
--    knows which escrow to fund. UNIQUE reference => idempotent.
-- ---------------------------------------------------------------------
create table if not exists public.customer_escrow_payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null,
  user_id      uuid not null,
  reference    text not null unique,
  amount       numeric not null check (amount > 0),
  currency     text not null default 'NGN',
  status       text not null default 'pending' check (status in ('pending','funded','failed','refunded')),
  paystack_ref text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint customer_escrow_payments_order_id_fkey foreign key (order_id) references public.orders(id),
  constraint customer_escrow_payments_user_id_fkey  foreign key (user_id)  references public.profiles(id)
);

create index if not exists customer_escrow_payments_reference_idx on public.customer_escrow_payments (reference);

-- ---------------------------------------------------------------------
-- 3. Rate limiting (fixed-window counters, DB-backed so it is shared
--    across serverless instances).
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, window_start)
);

create or replace function public.rate_limit_check(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('second', now()) - make_interval(secs => p_window_seconds);
  v_count integer;
begin
  -- Prune old windows opportunistically.
  delete from public.rate_limits
   where window_start < v_window
     and window_start < now() - interval '1 day';

  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- If the insert returned NULL (conflict path returning nothing), read it back.
  if v_count is null then
    select count into v_count from public.rate_limits where bucket = p_bucket and window_start = v_window;
  end if;

  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Wallet helpers
-- ---------------------------------------------------------------------

-- Ensure a wallet row exists for a user, returning its id.
-- (kept compatible with the existing ensure_wallet usage)
create or replace function public.ensure_wallet(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
begin
  select id into v_wallet_id from public.wallets where user_id = p_user_id;
  if v_wallet_id is null then
    insert into public.wallets (user_id, currency, available_balance, escrow_balance)
    values (p_user_id, 'NGN', 0, 0)
    returning id into v_wallet_id;
  end if;
  return v_wallet_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Top-up crediting (idempotent, driven by Paystack reference)
--    Called from the charge.success webhook / callback.
-- ---------------------------------------------------------------------
create or replace function public.credit_wallet_from_topup(
  p_user_id uuid,
  p_amount numeric,
  p_currency text default 'NGN',
  p_provider_reference text
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

  -- Idempotency: if this reference was already credited, do nothing.
  if exists (
    select 1 from public.wallet_ledger
    where idempotency_key = v_idem
  ) then
    return jsonb_build_object('ok', true, 'already_processed', true, 'wallet_id', v_wallet_id);
  end if;

  update public.wallets
     set available_balance = available_balance + p_amount,
         updated_at = now()
   where id = v_wallet_id
  returning available_balance into v_new_balance;

  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after,
    provider_reference, idempotency_key
  ) values (
    v_wallet_id, p_user_id, 'top_up', p_amount, v_new_balance,
    p_provider_reference, v_idem
  );

  return jsonb_build_object('ok', true, 'wallet_id', v_wallet_id, 'balance_after', v_new_balance);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. B2B escrow funding (wallet available -> escrow held)
--    Idempotent per order via escrow_ledger 'fund' entry.
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
  v_agency_owner uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;
  if v_order.buyer_id <> p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Not the order buyer');
  end if;
  if v_order.status not in ('proposed') then
    return jsonb_build_object('ok', false, 'error', 'Order cannot be funded from status ' || v_order.status);
  end if;

  -- Idempotency: already funded?
  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem) then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  v_wallet_id := public.ensure_wallet(p_buyer_id);

  select available_balance, escrow_balance
    into v_new_available, v_new_escrow
    from public.wallets
   where id = v_wallet_id;

  if v_new_available < v_order.total_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient wallet balance');
  end if;

  v_new_available := v_new_available - v_order.total_amount;
  v_new_escrow     := v_new_escrow     + v_order.total_amount;

  update public.wallets
     set available_balance = v_new_available,
         escrow_balance    = v_new_escrow,
         updated_at = now()
   where id = v_wallet_id;

  -- debit ledger on buyer wallet (escrow_hold)
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_wallet_id, p_buyer_id, 'escrow_hold', v_order.total_amount, v_new_available,
    'hold:' || v_order.id::text
  );

  -- escrow ledger fund entry (unique per order)
  insert into public.escrow_ledger (
    order_id, actor_id, entry_type, amount, currency, idempotency_key
  ) values (
    v_order.id, p_buyer_id, 'fund', v_order.total_amount, v_order.currency, v_idem
  );

  update public.orders set status = 'funded', updated_at = now() where id = v_order.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. B2C escrow funding (Paystack card payment)
--    Complete a customer escrow payment once Paystack confirms success.
--    Idempotent by reference + payment status.
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
  select * into v_payment from public.customer_escrow_payments where reference = p_reference;
  if v_payment is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown payment reference');
  end if;

  -- Idempotency: already funded?
  if v_payment.status = 'funded' then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  -- Cross-check amount (Paystack confirmed amount must match what we quoted).
  if p_amount <> v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Amount mismatch');
  end if;

  select * into v_order from public.orders where id = v_payment.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem) then
    -- Belt-and-suspenders: escrow already recorded, mark payment funded.
    update public.customer_escrow_payments
       set status = 'funded', updated_at = now()
     where id = v_payment.id;
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  v_wallet_id := public.ensure_wallet(v_payment.user_id);

  -- For B2C card funding we hold the funds in the buyer's escrow balance
  -- (no available-balance debit since money came from the card).
  select available_balance, escrow_balance into v_available, v_new_escrow
    from public.wallets where id = v_wallet_id;
  v_new_escrow := v_new_escrow + v_payment.amount;

  update public.wallets
     set escrow_balance = v_new_escrow,
         updated_at = now()
   where id = v_wallet_id;

  insert into public.escrow_ledger (
    order_id, actor_id, entry_type, amount, currency, idempotency_key
  ) values (
    v_order.id, v_payment.user_id, 'fund', v_payment.amount, p_currency, v_idem
  );

  -- Reflect the escrow hold on the buyer wallet ledger too.
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, provider_reference, idempotency_key
  ) values (
    v_wallet_id, v_payment.user_id, 'escrow_hold', v_payment.amount, v_new_escrow,
    p_reference, 'hold:' || p_reference
  );

  update public.orders set status = 'funded', updated_at = now() where id = v_order.id;

  update public.customer_escrow_payments
     set status = 'funded', paystack_ref = p_reference, updated_at = now()
   where id = v_payment.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Milestone release
--    Atomic: debit buyer escrow, credit seller (net) + platform (fee),
--    write ledgers, advance milestone + order. Guards over-release.
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
  select * into v_milestone from public.milestones where id = p_milestone_id;
  if v_milestone is null then
    return jsonb_build_object('ok', false, 'error', 'Milestone not found');
  end if;

  select * into v_order from public.orders where id = v_milestone.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  -- Only the buyer can release.
  if v_order.buyer_id <> p_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Only the buyer can release a milestone');
  end if;

  -- Milestone must be approved (seller submitted -> buyer approved).
  if v_milestone.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Milestone is not approved');
  end if;

  -- Order must be in an active state.
  if v_order.status not in ('funded', 'in_progress') then
    return jsonb_build_object('ok', false, 'error', 'Order is not active');
  end if;

  -- Idempotency.
  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem) then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  -- Fee config.
  select value::numeric into v_fee_rate from public.platform_config where key = 'platform_fee_rate';
  if v_fee_rate is null then v_fee_rate := 0.08; end if;
  select value::uuid into v_fee_user_id from public.platform_config where key = 'fee_wallet_user_id';
  if v_fee_user_id is null then v_fee_user_id := '00000000-0000-0000-0000-000000000000'::uuid; end if;

  -- Over-release guard: sum of already-released milestones + this one must not
  -- exceed the total funded for the order.
  select coalesce(sum(amount), 0) into v_sum_released
    from public.escrow_ledger
   where order_id = v_order.id and entry_type = 'release';

  if v_sum_released + v_milestone.amount > v_order.total_amount then
    return jsonb_build_object('ok', false, 'error', 'Release would exceed funded amount');
  end if;

  v_gross := v_milestone.amount;
  v_fee   := round(v_gross * v_fee_rate, 2);
  v_net   := v_gross - v_fee;

  -- Seller agency owner.
  select * into v_agency from public.agencies where id = v_order.agency_id;
  v_seller_wallet := public.ensure_wallet(v_agency.owner_id);
  v_buyer_wallet  := public.ensure_wallet(v_order.buyer_id);
  v_fee_wallet    := public.ensure_wallet(v_fee_user_id);

  -- Buyer escrow decrement.
  select escrow_balance into v_buyer_escrow from public.wallets where id = v_buyer_wallet;
  if v_buyer_escrow < v_gross then
    return jsonb_build_object('ok', false, 'error', 'Insufficient escrow balance');
  end if;
  v_buyer_escrow := v_buyer_escrow - v_gross;
  update public.wallets set escrow_balance = v_buyer_escrow, updated_at = now()
   where id = v_buyer_wallet;

  -- Seller net credit.
  select available_balance into v_seller_balance from public.wallets where id = v_seller_wallet;
  v_seller_balance := v_seller_balance + v_net;
  update public.wallets set available_balance = v_seller_balance, updated_at = now()
   where id = v_seller_wallet;

  -- Fee wallet credit.
  select available_balance into v_fee_balance from public.wallets where id = v_fee_wallet;
  v_fee_balance := v_fee_balance + v_fee;
  update public.wallets set available_balance = v_fee_balance, updated_at = now()
   where id = v_fee_wallet;

  -- Wallet ledgers.
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_buyer_wallet, v_order.buyer_id, 'escrow_release', v_gross, v_buyer_escrow,
    'buyer_release:' || v_milestone.id::text
  );
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_seller_wallet, v_agency.owner_id, 'escrow_release', v_net, v_seller_balance,
    'seller_release:' || v_milestone.id::text
  );
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, idempotency_key
  ) values (
    v_fee_wallet, v_agency.owner_id, 'fee', v_fee, v_fee_balance,
    'fee:' || v_milestone.id::text
  );

  -- Escrow ledger.
  insert into public.escrow_ledger (
    order_id, milestone_id, actor_id, entry_type, amount, currency, idempotency_key
  ) values (
    v_order.id, v_milestone.id, v_order.buyer_id, 'release', v_gross, v_order.currency, v_idem
  );

  -- Advance milestone + order.
  update public.milestones set status = 'released', due_at = coalesce(due_at, now())
   where id = v_milestone.id;

  -- If all milestones released, complete the order.
  if not exists (
    select 1 from public.milestones
     where order_id = v_order.id and status <> 'released'
  ) then
    update public.orders set status = 'completed', updated_at = now() where id = v_order.id;
    update public.agencies set completed_orders = completed_orders + 1 where id = v_order.agency_id;
  end if;

  return jsonb_build_object('ok', true, 'gross', v_gross, 'fee', v_fee, 'net', v_net);
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Milestone approval
--    Seller submits (pending -> submitted, order -> in_progress);
--    buyer approves (submitted -> approved).
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
  if v_milestone.status <> 'pending' and v_milestone.status <> 'funded' then
    return jsonb_build_object('ok', false, 'error', 'Milestone is not submittable');
  end if;
  update public.milestones set status = 'submitted' where id = v_milestone.id;
  update public.orders set status = 'in_progress', updated_at = now() where id = v_order.id;
  return jsonb_build_object('ok', true);
end;
$$;

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
-- 10. RLS (defense-in-depth). Tables are only mutated through these
--     security definer RPCs; RLS is enabled so direct client writes to
--     money tables are blocked. Reads are allowed for the owning user.
-- ---------------------------------------------------------------------
alter table public.platform_config       enable row level security;
alter table public.customer_escrow_payments enable row level security;
alter table public.rate_limits           enable row level security;
alter table public.wallets               enable row level security;
alter table public.wallet_ledger         enable row level security;
alter table public.escrow_ledger         enable row level security;

-- security definer functions bypass RLS; grant execute to authenticated.
grant execute on function public.ensure_wallet(uuid) to authenticated;
grant execute on function public.rate_limit_check(text, integer, integer) to authenticated;
grant execute on function public.credit_wallet_from_topup(uuid, numeric, text, text) to authenticated;
grant execute on function public.fund_escrow_from_wallet(uuid, uuid) to authenticated;
grant execute on function public.complete_customer_escrow(text, numeric, text) to authenticated;
grant execute on function public.release_milestone(uuid, uuid) to authenticated;
grant execute on function public.submit_milestone(uuid, uuid) to authenticated;
grant execute on function public.approve_milestone(uuid, uuid) to authenticated;

-- A user may read only their own wallet.
create policy wallet_select_own on public.wallets
  for select using (auth.uid() = user_id);
create policy wallet_ledger_select_own on public.wallet_ledger
  for select using (auth.uid() in (
    select user_id from public.wallets where id = wallet_id
  ));
create policy escrow_ledger_select_participant on public.escrow_ledger
  for select using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));
create policy customer_escrow_payments_select_own on public.customer_escrow_payments
  for select using (auth.uid() = user_id);
