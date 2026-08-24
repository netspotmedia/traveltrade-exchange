-- =====================================================================
-- TTX Soft-Delete Hardening
-- Adds deleted_at to financial/domain tables so records can be
-- soft-deleted instead of removed, preserving audit trails. Queries in
-- the application filter `deleted_at IS NULL`.
--
-- NOTE: Applied on top of prior migrations. Idempotent (add column if
-- not exists).
-- =====================================================================

do $$
begin
  -- orders
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'deleted_at') then
    alter table public.orders add column deleted_at timestamptz;
  end if;
  -- milestones
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'milestones' and column_name = 'deleted_at') then
    alter table public.milestones add column deleted_at timestamptz;
  end if;
  -- wallets
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wallets' and column_name = 'deleted_at') then
    alter table public.wallets add column deleted_at timestamptz;
  end if;
  -- wallet_ledger
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wallet_ledger' and column_name = 'deleted_at') then
    alter table public.wallet_ledger add column deleted_at timestamptz;
  end if;
  -- escrow_ledger
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'escrow_ledger' and column_name = 'deleted_at') then
    alter table public.escrow_ledger add column deleted_at timestamptz;
  end if;
  -- withdrawals
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'deleted_at') then
    alter table public.withdrawals add column deleted_at timestamptz;
  end if;
  -- customer_escrow_payments
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'customer_escrow_payments' and column_name = 'deleted_at') then
    alter table public.customer_escrow_payments add column deleted_at timestamptz;
  end if;
  -- disputes
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'disputes' and column_name = 'deleted_at') then
    alter table public.disputes add column deleted_at timestamptz;
  end if;
  -- proposals
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'proposals' and column_name = 'deleted_at') then
    alter table public.proposals add column deleted_at timestamptz;
  end if;
  -- services
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'deleted_at') then
    alter table public.services add column deleted_at timestamptz;
  end if;
  -- agencies
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agencies' and column_name = 'deleted_at') then
    alter table public.agencies add column deleted_at timestamptz;
  end if;
end $$;

-- Indexes to keep soft-delete filtering fast.
create index if not exists orders_deleted_at_idx on public.orders (deleted_at);
create index if not exists milestones_deleted_at_idx on public.milestones (deleted_at);
create index if not exists wallets_deleted_at_idx on public.wallets (deleted_at);
create index if not exists wallet_ledger_deleted_at_idx on public.wallet_ledger (deleted_at);
create index if not exists escrow_ledger_deleted_at_idx on public.escrow_ledger (deleted_at);
create index if not exists withdrawals_deleted_at_idx on public.withdrawals (deleted_at);
create index if not exists customer_escrow_payments_deleted_at_idx on public.customer_escrow_payments (deleted_at);
create index if not exists disputes_deleted_at_idx on public.disputes (deleted_at);
create index if not exists proposals_deleted_at_idx on public.proposals (deleted_at);
create index if not exists services_deleted_at_idx on public.services (deleted_at);
create index if not exists agencies_deleted_at_idx on public.agencies (deleted_at);
