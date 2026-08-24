-- =====================================================================
-- TTX Quote/RFQ & Proposals
-- Built on the existing schema (orders, milestones, services, agencies,
-- order_messages).
--
-- NOTE: Applied on top of prior migrations. Only ADDS objects/columns.
-- Idempotent (create table if not exists / add column if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ordering_mode on services (quote_required | instant_order)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'ordering_mode') then
    alter table public.services add column ordering_mode text not null default 'quote_required'
      check (ordering_mode in ('quote_required', 'instant_order'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. proposals table (linked to orders; counter-offers via parent)
-- ---------------------------------------------------------------------
create table if not exists public.proposals (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null,
  agency_id         uuid not null,
  parent_proposal_id uuid,
  fee_amount        numeric not null check (fee_amount >= 0),
  timeline_days     integer,
  note              text,
  status            text not null default 'pending' check (status in ('pending','submitted','countered','accepted','rejected','declined')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint proposals_order_id_fkey foreign key (order_id) references public.orders(id),
  constraint proposals_agency_id_fkey foreign key (agency_id) references public.agencies(id),
  constraint proposals_parent_fkey foreign key (parent_proposal_id) references public.proposals(id)
);

create index if not exists proposals_order_idx on public.proposals (order_id);

-- ---------------------------------------------------------------------
-- 3. RLS on proposals (participants can read; agencies can create/update
--    their own proposals)
-- ---------------------------------------------------------------------
alter table public.proposals enable row level security;

drop policy if exists proposals_participant_select on public.proposals;
create policy proposals_participant_select on public.proposals
  for select
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a where a.id = agency_id
  ));

drop policy if exists proposals_agency_insert on public.proposals;
create policy proposals_agency_insert on public.proposals
  for insert
  with check (auth.uid() in (
    select owner_id from public.agencies a where a.id = agency_id
  ));

drop policy if exists proposals_agency_update on public.proposals;
create policy proposals_agency_update on public.proposals
  for update
  using (auth.uid() in (
    select owner_id from public.agencies a where a.id = agency_id
  ));

-- ---------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------
grant select, insert, update on public.proposals to authenticated;
