-- =====================================================================
-- TTX RLS Write Access (restores agent / agreement write journeys)
-- The app creates agencies, KYC docs, services, milestones and updates
-- orders/proposals through the user-session client. RLS had only read
-- policies (and select-only grants) on these tables, so those writes were
-- blocked in production. This migration adds scoped write policies and
-- grants. All writes remain limited to the owning user or order
-- participants. Security-definer RPCs are unaffected.
--
-- NOTE: Additive + idempotent (drop policy if exists / create).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. agencies — owner may create and update their own
-- ---------------------------------------------------------------------
drop policy if exists agencies_owner_insert on public.agencies;
create policy agencies_owner_insert on public.agencies
  for insert with check (auth.uid() = owner_id);

drop policy if exists agencies_owner_update on public.agencies;
create policy agencies_owner_update on public.agencies
  for update using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- 2. kyc_documents — agency owner may insert
-- ---------------------------------------------------------------------
drop policy if exists kyc_documents_owner_insert on public.kyc_documents;
create policy kyc_documents_owner_insert on public.kyc_documents
  for insert with check (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
  ));

-- ---------------------------------------------------------------------
-- 3. services — agency owner may insert and update
-- ---------------------------------------------------------------------
drop policy if exists services_owner_insert on public.services;
create policy services_owner_insert on public.services
  for insert with check (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
  ));

drop policy if exists services_owner_update on public.services;
create policy services_owner_update on public.services
  for update using (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
  ));

-- ---------------------------------------------------------------------
-- 4. orders — participants (buyer or agency owner) may update
-- ---------------------------------------------------------------------
drop policy if exists orders_participant_update on public.orders;
create policy orders_participant_update on public.orders
  for update using (auth.uid() in (
    select buyer_id from public.orders o where o.id = orders.id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = orders.id
  ));

-- ---------------------------------------------------------------------
-- 5. milestones — participants may insert; delete only while the order
--    is still open ('proposed') so funded/approved milestones are never
--    removed directly.
-- ---------------------------------------------------------------------
drop policy if exists milestones_participant_insert on public.milestones;
create policy milestones_participant_insert on public.milestones
  for insert with check (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

drop policy if exists milestones_participant_delete on public.milestones;
create policy milestones_participant_delete on public.milestones
  for delete using (
    auth.uid() in (
      select buyer_id from public.orders where id = order_id
      union
      select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
    )
    and (select status from public.orders where id = order_id) = 'proposed'
  );

-- ---------------------------------------------------------------------
-- 6. proposals — buyer may update (accept / reject); agency owner
--    update policy already exists.
-- ---------------------------------------------------------------------
drop policy if exists proposals_buyer_update on public.proposals;
create policy proposals_buyer_update on public.proposals
  for update using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
  ));

-- ---------------------------------------------------------------------
-- 7. Grants (privileges; RLS still governs rows)
-- ---------------------------------------------------------------------
grant insert, update on public.agencies to authenticated;
grant insert on public.kyc_documents to authenticated;
grant insert, update on public.services to authenticated;
grant update on public.orders to authenticated;
grant insert, delete on public.milestones to authenticated;