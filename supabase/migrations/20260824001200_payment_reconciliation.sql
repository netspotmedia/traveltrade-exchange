-- =====================================================================
-- TTX Payment Reconciliation & Failure Handling
-- Adds a failed_payment_callbacks table to persist Paystack webhooks that
-- could not be settled, so no real charge is ever silently lost, and an
-- admin reconciliation RPC to inspect/retry them.
--
-- NOTE: Applied on top of prior migrations. Idempotent (create if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Failed payment callbacks (money-loss safety net)
-- ---------------------------------------------------------------------
create table if not exists public.failed_payment_callbacks (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null,
  event_type    text not null default 'charge.success',
  payload       jsonb not null default '{}'::jsonb,
  reason        text,
  amount        numeric,
  currency      text,
  status        text not null default 'pending' check (status in ('pending','resolved','ignored')),
  retry_count   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists failed_payment_callbacks_ref_idx on public.failed_payment_callbacks (reference);
create index if not exists failed_payment_callbacks_status_idx on public.failed_payment_callbacks (status);

alter table public.failed_payment_callbacks enable row level security;

-- Admin-only read via security-definer RPC; block direct client access.
drop policy if exists failed_payment_callbacks_no_select on public.failed_payment_callbacks;
create policy failed_payment_callbacks_no_select on public.failed_payment_callbacks
  for select using (false);

-- ---------------------------------------------------------------------
-- 2. Persist a failed callback (idempotent by reference).
-- ---------------------------------------------------------------------
create or replace function public.record_failed_callback(
  p_reference text,
  p_payload jsonb,
  p_reason text,
  p_amount numeric,
  p_currency text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.failed_payment_callbacks (reference, payload, reason, amount, currency, status)
  values (p_reference, p_payload, p_reason, p_amount, p_currency, 'pending')
  on conflict (reference) do update
    set retry_count = public.failed_payment_callbacks.retry_count + 1,
        reason = excluded.reason,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Admin reconciliation view of pending failed callbacks.
-- ---------------------------------------------------------------------
create or replace function public.admin_get_failed_callbacks(p_limit integer default 100)
returns table (
  id uuid,
  reference text,
  reason text,
  amount numeric,
  currency text,
  status text,
  retry_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    raise exception 'Admin access required';
  end if;
  return query
    select f.id, f.reference, f.reason, f.amount, f.currency, f.status, f.retry_count, f.created_at
      from public.failed_payment_callbacks f
     order by f.created_at desc
     limit p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Resolve a failed callback (admin marks it resolved/ignored).
-- ---------------------------------------------------------------------
create or replace function public.admin_resolve_failed_callback(
  p_callback_id uuid,
  p_status text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = p_actor_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;
  if p_status not in ('resolved','ignored') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status');
  end if;
  update public.failed_payment_callbacks
     set status = p_status, updated_at = now()
   where id = p_callback_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.record_failed_callback(text, jsonb, text, numeric, text) to authenticated;
grant execute on function public.admin_get_failed_callbacks(integer) to authenticated;
grant execute on function public.admin_resolve_failed_callback(uuid, text, uuid) to authenticated;
