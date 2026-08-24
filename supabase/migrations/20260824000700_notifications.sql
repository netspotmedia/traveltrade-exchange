-- =====================================================================
-- TTX Notifications & Email Dispatcher
-- Built on the existing schema (notifications).
--
-- NOTE: Applied on top of prior migrations. Only ADDS objects.
-- Idempotent (create if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Email log (centralized dispatch, retry, dedupe)
-- ---------------------------------------------------------------------
create table if not exists public.email_logs (
  id              uuid primary key default gen_random_uuid(),
  recipient       text not null,
  subject         text not null,
  body            text,
  provider        text not null default 'resend',
  status          text not null default 'queued' check (status in ('queued','sending','retrying','sent','failed','skipped')),
  attempts        integer not null default 0,
  next_retry_at   timestamptz,
  dedupe_key      text,
  error           text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  updated_at      timestamptz not null default now()
);

create index if not exists email_logs_dedupe_idx on public.email_logs (dedupe_key);
create index if not exists email_logs_retry_idx on public.email_logs (status, next_retry_at);
create index if not exists email_logs_recipient_idx on public.email_logs (recipient);

-- ---------------------------------------------------------------------
-- 2. Notification preferences (per user + event; mandatory types always send)
-- ---------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid not null,
  event   text not null,
  email   boolean not null default true,
  primary key (user_id, event)
);

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
alter table public.email_logs enable row level security;
alter table public.notification_preferences enable row level security;

-- Only the owning user can read their own email log entries (by recipient match
-- is not reliable; restrict to nothing by default — admin/service reads only).
-- Email logs are managed server-side; no direct client access needed.
create policy email_logs_none on public.email_logs for select using (false);

-- A user may read/update their own notification preferences.
create policy notif_pref_select_own on public.notification_preferences
  for select using (auth.uid() = user_id);
create policy notif_pref_insert_own on public.notification_preferences
  for insert with check (auth.uid() = user_id);
create policy notif_pref_update_own on public.notification_preferences
  for update using (auth.uid() = user_id);
