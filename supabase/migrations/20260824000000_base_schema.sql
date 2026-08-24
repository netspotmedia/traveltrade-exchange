-- =====================================================================
-- TTX Base Schema
-- Reconstructs the core tables that the app relies on so a fresh
-- environment can be provisioned from migrations alone. The original
-- schema was applied as a database dump (via v0/Supabase) and was never
-- captured in a migration; this file backfills it.
--
-- SAFETY: Every statement is `create table if not exists`, so this is a
-- no-op on any environment where the tables already exist. It only
-- materializes tables on fresh databases.
--
-- NOTE: Columns that later migrations add (deleted_at, ordering_mode,
-- read_at, bank/account withdrawal columns, etc.) are intentionally NOT
-- included here so those migrations remain the source of truth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  email      text,
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- agencies (verified sellers)
-- ---------------------------------------------------------------------
create table if not exists public.agencies (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles (id) on delete cascade,
  name               text not null,
  slug               text not null unique,
  country            text not null default 'Nigeria',
  city               text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  rating             numeric not null default 0,
  completed_orders   integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists agencies_owner_idx on public.agencies (owner_id);

-- ---------------------------------------------------------------------
-- services (marketplace listings)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies (id) on delete cascade,
  title       text not null,
  slug        text not null unique,
  category    text not null,
  description text,
  location    text,
  base_price  numeric not null check (base_price >= 0),
  currency    text not null default 'NGN',
  status      text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists services_agency_idx on public.services (agency_id);
create index if not exists services_status_idx on public.services (status);

-- ---------------------------------------------------------------------
-- orders (instant orders + quote requests)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  agency_id       uuid not null references public.agencies (id),
  service_id      uuid references public.services (id),
  title           text not null,
  total_amount    numeric not null default 0 check (total_amount >= 0),
  currency        text not null default 'NGN',
  status          text not null default 'proposed' check (status in ('proposed', 'funded', 'in_progress', 'delivered', 'completed', 'disputed', 'cancelled')),
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_agency_idx on public.orders (agency_id);

-- ---------------------------------------------------------------------
-- milestones (per-order payment tranches)
-- ---------------------------------------------------------------------
create table if not exists public.milestones (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  title      text not null,
  amount     numeric not null check (amount > 0),
  status     text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'released', 'funded')),
  due_at     timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists milestones_order_idx on public.milestones (order_id);

-- ---------------------------------------------------------------------
-- wallets (one per user; balances are only mutated by security-definer RPCs)
-- ---------------------------------------------------------------------
create table if not exists public.wallets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade unique,
  currency          text not null default 'NGN',
  available_balance numeric not null default 0 check (available_balance >= 0),
  escrow_balance    numeric not null default 0 check (escrow_balance >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- wallet_ledger (immutable money movement trail per wallet)
-- ---------------------------------------------------------------------
create table if not exists public.wallet_ledger (
  id                uuid primary key default gen_random_uuid(),
  wallet_id         uuid not null references public.wallets (id) on delete cascade,
  actor_id          uuid references public.profiles (id),
  entry_type        text not null check (entry_type in ('top_up', 'escrow_hold', 'escrow_release', 'withdrawal', 'refund', 'fee')),
  amount            numeric not null check (amount > 0),
  balance_after     numeric not null default 0,
  provider_reference text,
  idempotency_key   text,
  created_at        timestamptz not null default now(),
  constraint wallet_ledger_idempotency_unique unique (idempotency_key)
);

create index if not exists wallet_ledger_wallet_idx on public.wallet_ledger (wallet_id);

-- ---------------------------------------------------------------------
-- escrow_ledger (per-order escrow movements: fund / release / refund)
-- ---------------------------------------------------------------------
create table if not exists public.escrow_ledger (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  milestone_id    uuid references public.milestones (id),
  actor_id        uuid references public.profiles (id),
  entry_type      text not null check (entry_type in ('fund', 'release', 'refund')),
  amount          numeric not null check (amount > 0),
  currency        text not null default 'NGN',
  idempotency_key text,
  created_at      timestamptz not null default now(),
  constraint escrow_ledger_idempotency_unique unique (idempotency_key)
);

create index if not exists escrow_ledger_order_idx on public.escrow_ledger (order_id);

-- ---------------------------------------------------------------------
-- withdrawals (bank-account columns are added by a later migration)
-- ---------------------------------------------------------------------
create table if not exists public.withdrawals (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.profiles (id) on delete cascade,
  amount     numeric not null check (amount > 0),
  currency   text not null default 'NGN',
  status     text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reference  text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists withdrawals_seller_idx on public.withdrawals (seller_id);

-- ---------------------------------------------------------------------
-- disputes
-- ---------------------------------------------------------------------
create table if not exists public.disputes (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  opened_by       uuid not null references public.profiles (id),
  reason          text,
  status          text not null default 'open' check (status in ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed')),
  resolution_note text,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists disputes_order_idx on public.disputes (order_id);

-- ---------------------------------------------------------------------
-- kyc_documents (agency verification evidence)
-- ---------------------------------------------------------------------
create table if not exists public.kyc_documents (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references public.agencies (id) on delete cascade,
  document_type text not null default 'business_registration',
  storage_path  text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  created_at    timestamptz not null default now()
);

create index if not exists kyc_documents_agency_idx on public.kyc_documents (agency_id);

-- ---------------------------------------------------------------------
-- admin_reviews (moderation audit trail)
-- ---------------------------------------------------------------------
create table if not exists public.admin_reviews (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  reviewer_id uuid not null references public.profiles (id),
  decision    text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_reviews_entity_idx on public.admin_reviews (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- notifications (in-app)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------
-- order_messages (per-order conversation; read_at added by a later migration)
-- ---------------------------------------------------------------------
create table if not exists public.order_messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id),
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_idx on public.order_messages (order_id);