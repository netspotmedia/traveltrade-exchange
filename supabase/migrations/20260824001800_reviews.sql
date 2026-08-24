-- =====================================================================
-- TTX Reviews
-- One review per completed order (unique order_id), tied to a service so
-- counts/averages can be surfaced on marketplace cards and detail pages.
-- Only the order buyer may create a review, and only after completion.
--
-- NOTE: Additive + idempotent.
-- =====================================================================

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null unique references public.orders (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists reviews_service_idx on public.reviews (service_id);
create index if not exists reviews_author_idx on public.reviews (author_id);

alter table public.reviews enable row level security;

-- Public may read reviews for published services; participants and admins
-- may read their own order reviews regardless of service status.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (
    deleted_at is null and (
      exists (select 1 from public.services s where s.id = service_id and s.status = 'published' and s.deleted_at is null)
      or auth.uid() in (select buyer_id from public.orders where id = order_id)
      or auth.uid() in (select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id)
      or auth.uid() in (select id from public.profiles where role = 'admin')
    )
  );

-- Only the buyer of a completed order may post a review (defense in depth;
-- the API route enforces the same rules).
drop policy if exists reviews_buyer_insert on public.reviews;
create policy reviews_buyer_insert on public.reviews
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'completed' and o.deleted_at is null
    )
  );

grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;