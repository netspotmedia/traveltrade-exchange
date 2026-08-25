-- =====================================================================
-- TTX CMS & Site Assets
-- Adds marketing content management tables so page copy can be edited by
-- admins without a code deploy. Marketing pages read published content
-- with safe defaults when no row exists (see lib/cms.ts).
--
-- SAFETY: Additive only. `create table if not exists` + `drop policy if
-- exists` + `create policy`. Never alters existing tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- cms_pages — one row per marketing page (landing, how-it-works, about,
-- help, contact, privacy, terms). Sections is a JSONB map of
-- { sectionKey: contentObject } so the UI can render arbitrary blocks.
-- ---------------------------------------------------------------------
create table if not exists public.cms_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  sections    jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cms_pages_slug_idx on public.cms_pages (slug);

-- ---------------------------------------------------------------------
-- site_assets — keyed brand assets (logo, favicon, og_image) with URL,
-- dimensions and alt text. Used by the public header/footer/head.
-- ---------------------------------------------------------------------
create table if not exists public.site_assets (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  url         text not null,
  alt         text,
  width       integer,
  height      integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists site_assets_key_idx on public.site_assets (key);

-- ---------------------------------------------------------------------
-- RLS — public read for published marketing content; admin write only.
-- ---------------------------------------------------------------------
alter table public.cms_pages enable row level security;
alter table public.site_assets enable row level security;

drop policy if exists cms_pages_public_read on public.cms_pages;
create policy cms_pages_public_read on public.cms_pages
  for select
  using (is_published = true);

drop policy if exists cms_pages_admin_write on public.cms_pages;
create policy cms_pages_admin_write on public.cms_pages
  for all
  using (auth.uid() in (select id from public.profiles where role = 'admin'))
  with check (auth.uid() in (select id from public.profiles where role = 'admin'));

drop policy if exists site_assets_public_read on public.site_assets;
create policy site_assets_public_read on public.site_assets
  for select
  using (true);

drop policy if exists site_assets_admin_write on public.site_assets;
create policy site_assets_admin_write on public.site_assets
  for all
  using (auth.uid() in (select id from public.profiles where role = 'admin'))
  with check (auth.uid() in (select id from public.profiles where role = 'admin'));

-- Grants: anon can read published content (marketing pages are public);
-- authenticated can read too; only admins write.
grant select on public.cms_pages to anon, authenticated;
grant select, insert, update, delete on public.cms_pages to authenticated;
grant select on public.site_assets to anon, authenticated;
grant select, insert, update, delete on public.site_assets to authenticated;
