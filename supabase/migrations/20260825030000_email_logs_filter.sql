-- =====================================================================
-- TTX Email Log Filtering
-- Adds a status-filtered admin email-log viewer for the dedicated
-- admin email-logs screen. Additive; the original admin_get_email_logs
-- remains unchanged.
-- =====================================================================

create or replace function public.admin_get_email_logs_filtered(
  p_status text default null,
  p_limit integer default 50
) returns table (
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
    select e.id,
           regexp_replace(e.recipient, '^(.{0,3}).*(@.+)$', '\1***\2') as recipient,
           e.subject, e.provider, e.status, e.attempts, e.error, e.created_at
      from public.email_logs e
     where (p_status is null or e.status = p_status)
     order by e.created_at desc
     limit p_limit;
end;
$$;

-- Counts per status for the stat cards (admin only).
create or replace function public.admin_get_email_status_counts()
returns table (status text, count bigint)
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
    select e.status, count(*)::bigint
      from public.email_logs e
     group by e.status
     order by e.status;
end;
$$;

grant execute on function public.admin_get_email_logs_filtered(text, integer) to authenticated;
grant execute on function public.admin_get_email_status_counts() to authenticated;