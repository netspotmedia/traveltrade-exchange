-- =====================================================================
-- TTX Admin Operations Metrics
-- Security-definer RPCs that bypass RLS (which restricts financial reads
-- to owners) but verify the caller is an admin. Used by the admin console
-- for KPI cards and the email-log viewer.
--
-- NOTE: Applied on top of prior migrations. Idempotent (create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin KPIs (escrow held, fees collected, active orders, verified
--    agencies, published services, total users).
-- ---------------------------------------------------------------------
create or replace function public.admin_get_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_escrow numeric;
  v_fees numeric;
  v_active_orders bigint;
  v_verified_agencies bigint;
  v_published_services bigint;
  v_total_users bigint;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select coalesce(sum(escrow_balance), 0) into v_escrow
    from public.wallets where deleted_at is null;

  select coalesce(sum(amount), 0) into v_fees
    from public.wallet_ledger where entry_type = 'fee' and deleted_at is null;

  select count(*) into v_active_orders
    from public.orders
   where status in ('funded', 'in_progress') and deleted_at is null;

  select count(*) into v_verified_agencies
    from public.agencies where verification_status = 'verified' and deleted_at is null;

  select count(*) into v_published_services
    from public.services where status = 'published' and deleted_at is null;

  select count(*) into v_total_users
    from auth.users;

  return jsonb_build_object(
    'ok', true,
    'escrow_held', v_escrow,
    'fees_collected', v_fees,
    'active_orders', v_active_orders,
    'verified_agencies', v_verified_agencies,
    'published_services', v_published_services,
    'total_users', v_total_users
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Admin email-log viewer (recent logs, newest first).
-- ---------------------------------------------------------------------
create or replace function public.admin_get_email_logs(p_limit integer default 50)
returns table (
  id uuid,
  recipient text,
  subject text,
  provider text,
  status text,
  attempts integer,
  error text,
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
    select e.id, e.recipient, e.subject, e.provider, e.status, e.attempts, e.error, e.created_at
      from public.email_logs e
     order by e.created_at desc
     limit p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Admin withdrawal/dispute summary counts.
-- ---------------------------------------------------------------------
create or replace function public.admin_get_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_pending_withdrawals bigint;
  v_open_disputes bigint;
  v_failed_emails bigint;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select count(*) into v_pending_withdrawals
    from public.withdrawals where status = 'pending' and deleted_at is null;

  select count(*) into v_open_disputes
    from public.disputes where status in ('open', 'under_review') and deleted_at is null;

  select count(*) into v_failed_emails
    from public.email_logs where status = 'failed';

  return jsonb_build_object(
    'ok', true,
    'pending_withdrawals', v_pending_withdrawals,
    'open_disputes', v_open_disputes,
    'failed_emails', v_failed_emails
  );
end;
$$;

grant execute on function public.admin_get_kpis() to authenticated;
grant execute on function public.admin_get_email_logs(integer) to authenticated;
grant execute on function public.admin_get_summary() to authenticated;
