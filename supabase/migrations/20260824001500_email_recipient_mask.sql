-- =====================================================================
-- TTX Email Recipient Masking (admin viewer)
-- email_logs now stores the full recipient so the cron worker can re-send
-- failed/retrying emails. This re-creates the admin viewer so it masks the
-- recipient (PII) at display time while keeping the raw value server-side.
--
-- Idempotent (create or replace).
-- =====================================================================

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
    select e.id,
           regexp_replace(e.recipient, '^(.{0,3}).*(@.+)$', '\1***\2') as recipient,
           e.subject, e.provider, e.status, e.attempts, e.error, e.created_at
      from public.email_logs e
     order by e.created_at desc
     limit p_limit;
end;
$$;

grant execute on function public.admin_get_email_logs(integer) to authenticated;