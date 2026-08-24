-- =====================================================================
-- TTX RLS Coverage & Hardening
-- Enables Row Level Security and adds policies on the remaining tables so
-- every financial/domain table is protected. The security definer RPCs
-- (ensure_wallet, fund_escrow_from_wallet, release_milestone,
-- review_agency_kyb, review_service, process_withdrawal, resolve_dispute,
-- credit_wallet_from_topup, etc.) bypass RLS, so these policies do not
-- break server-side settlement. They only govern direct client access.
--
-- NOTE: Applied on top of prior migrations. Idempotent (drop policy if
-- exists + create).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. orders (participant access; all writes go through RPCs)
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists orders_participant_select on public.orders;
create policy orders_participant_select on public.orders
  for select
  using (auth.uid() in (
    select buyer_id from public.orders o where o.id = orders.id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = orders.id
  ));

-- Buyers may create orders (quote requests / instant orders).
drop policy if exists orders_buyer_insert on public.orders;
create policy orders_buyer_insert on public.orders
  for insert
  with check (auth.uid() = buyer_id);

-- ---------------------------------------------------------------------
-- 2. milestones (order participants)
-- ---------------------------------------------------------------------
alter table public.milestones enable row level security;

drop policy if exists milestones_participant_select on public.milestones;
create policy milestones_participant_select on public.milestones
  for select
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

-- ---------------------------------------------------------------------
-- 3. proposals (already has policies; add update-by-participant for buyer
--    accept/reject handled by API layer with ownership checks).
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 4. withdrawals (owner reads own; admin reads/updates)
-- ---------------------------------------------------------------------
alter table public.withdrawals enable row level security;

drop policy if exists withdrawals_owner_select on public.withdrawals;
create policy withdrawals_owner_select on public.withdrawals
  for select
  using (auth.uid() = seller_id or auth.uid() in (
    select id from public.profiles where role = 'admin'
  ));

-- ---------------------------------------------------------------------
-- 5. disputes (order participants + admin)
-- ---------------------------------------------------------------------
alter table public.disputes enable row level security;

drop policy if exists disputes_participant_select on public.disputes;
create policy disputes_participant_select on public.disputes
  for select
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
    union
    select id from public.profiles where role = 'admin'
  ));

-- Participants may open a dispute on an order they are part of.
drop policy if exists disputes_participant_insert on public.disputes;
create policy disputes_participant_insert on public.disputes
  for insert
  with check (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

-- ---------------------------------------------------------------------
-- 6. notifications (owner read + mark read)
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_owner_select on public.notifications;
create policy notifications_owner_select on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications
  for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 7. kyc_documents (agency owner reads own)
-- ---------------------------------------------------------------------
alter table public.kyc_documents enable row level security;

drop policy if exists kyc_documents_owner_select on public.kyc_documents;
create policy kyc_documents_owner_select on public.kyc_documents
  for select
  using (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
    union
    select id from public.profiles where role = 'admin'
  ));

-- ---------------------------------------------------------------------
-- 8. admin_reviews (admins only; writes via RPCs)
-- ---------------------------------------------------------------------
alter table public.admin_reviews enable row level security;

drop policy if exists admin_reviews_admin_select on public.admin_reviews;
create policy admin_reviews_admin_select on public.admin_reviews
  for select
  using (auth.uid() in (
    select id from public.profiles where role = 'admin'
  ));

-- ---------------------------------------------------------------------
-- 9. platform_config (server/RPC only; no direct client reads)
-- ---------------------------------------------------------------------
alter table public.platform_config enable row level security;

drop policy if exists platform_config_no_select on public.platform_config;
create policy platform_config_no_select on public.platform_config
  for select
  using (false);

-- ---------------------------------------------------------------------
-- 10. rate_limits (RPC only; no direct client access)
-- ---------------------------------------------------------------------
alter table public.rate_limits enable row level security;

drop policy if exists rate_limits_no_select on public.rate_limits;
create policy rate_limits_no_select on public.rate_limits
  for select
  using (false);

-- ---------------------------------------------------------------------
-- 11. agencies (owner reads own; admin reads all; public can read verified)
-- ---------------------------------------------------------------------
alter table public.agencies enable row level security;

drop policy if exists agencies_public_read_verified on public.agencies;
create policy agencies_public_read_verified on public.agencies
  for select
  using (verification_status = 'verified' or auth.uid() = owner_id or auth.uid() in (
    select id from public.profiles where role = 'admin'
  ));

-- ---------------------------------------------------------------------
-- 12. services (public reads published; owner + admin read all)
-- ---------------------------------------------------------------------
alter table public.services enable row level security;

drop policy if exists services_public_read_published on public.services;
create policy services_public_read_published on public.services
  for select
  using (status = 'published' or auth.uid() in (
    select owner_id from public.agencies where id = agency_id
    union
    select id from public.profiles where role = 'admin'
  ));

-- ---------------------------------------------------------------------
-- Grants: ensure authenticated has baseline privileges that policies refine.
-- ---------------------------------------------------------------------
grant select, insert, update on public.orders to authenticated;
grant select on public.milestones to authenticated;
grant select on public.withdrawals to authenticated;
grant select, insert on public.disputes to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.kyc_documents to authenticated;
grant select on public.admin_reviews to authenticated;
grant select on public.agencies to authenticated;
grant select on public.services to authenticated;
