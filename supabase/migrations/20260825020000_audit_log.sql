-- =====================================================================
-- TTX Audit Log
-- Adds an append-only audit trail for admin/operator actions and key
-- platform state transitions, giving a single chronological feed like the
-- TTX Next activity log. Complements (does not replace) admin_reviews,
-- which records moderation decisions on specific entities.
--
-- SAFETY: Additive only. create table if not exists, create or replace
-- function. Does not modify existing tables.
-- =====================================================================

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- Append an audit entry (any authenticated user; the actor is taken from
-- auth context, so callers cannot spoof it).
create or replace function public.log_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin feed: newest N entries with actor identity. Admin only.
create or replace function public.admin_get_audit_logs(p_limit integer default 50)
returns table (
  id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  actor_name text,
  actor_email text,
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
    select a.id, a.action, a.entity_type, a.entity_id,
           p.full_name, p.email, a.created_at
      from public.audit_logs a
      left join public.profiles p on p.id = a.actor_id
     order by a.created_at desc
     limit p_limit;
end;
$$;

alter table public.audit_logs enable row level security;

-- Admins read; writes happen only through the security-definer RPC.
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
  for select
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;
grant execute on function public.admin_get_audit_logs(integer) to authenticated;