-- =====================================================================
-- TTX Agency Response Stats
-- Real, computed response metrics derived from existing order + proposal
-- activity. No schema change — read-only security-definer RPCs that
-- aggregate non-sensitive statistics (response time, response rate,
-- order volume) for public trust display on marketplace / agent profiles.
--
-- NOTE: Only aggregate numbers are returned — never order content, PII
-- or financial data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Single agency stats (used on the agent profile + service detail)
--    response_rate    : % of the agency's orders that received a proposal
--    avg_response_hours: median first-response time across quote requests
-- ---------------------------------------------------------------------
create or replace function public.agency_response_stats(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_responded bigint;
  v_avg_hours numeric;
begin
  select count(*) into v_total
    from public.orders o
   where o.agency_id = p_agency_id
     and o.deleted_at is null;

  select count(distinct p.order_id) into v_responded
    from public.proposals p
    join public.orders o on o.id = p.order_id
   where o.agency_id = p_agency_id
     and o.deleted_at is null
     and p.deleted_at is null;

  select round(avg(extract(epoch from (f.created_at - o.created_at)) / 3600.0), 1) into v_avg_hours
    from public.orders o
    join lateral (
      select min(p.created_at) as created_at
        from public.proposals p
       where p.order_id = o.id
         and p.deleted_at is null
    ) f on true
   where o.agency_id = p_agency_id
     and o.deleted_at is null
     and f.created_at is not null;

  if v_total is null or v_total = 0 then
    return jsonb_build_object('ok', true, 'total_orders', 0, 'response_rate', null, 'avg_response_hours', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'total_orders', v_total,
    'response_rate', round((coalesce(v_responded, 0)::numeric / v_total) * 100, 0),
    'avg_response_hours', v_avg_hours
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Batch stats (used by the marketplace to annotate a page of cards
--    with a single query).
-- ---------------------------------------------------------------------
create or replace function public.agency_response_stats_batch(p_agency_ids uuid[])
returns table (
  agency_id uuid,
  avg_response_hours numeric,
  response_rate numeric,
  total_orders bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with base as (
    select o.agency_id,
           o.id as order_id,
           o.created_at,
           (select min(p.created_at) from public.proposals p where p.order_id = o.id and p.deleted_at is null) as first_proposal_at
      from public.orders o
     where o.agency_id = any(p_agency_ids)
       and o.deleted_at is null
  ),
  per_agency as (
    select b.agency_id,
           count(*) as total_orders,
           count(b.first_proposal_at) as responded,
           avg(extract(epoch from (b.first_proposal_at - b.created_at)) / 3600.0) as avg_hours
      from base b
     group by b.agency_id
  )
  select pa.agency_id,
         round(pa.avg_hours::numeric, 1),
         case when pa.total_orders > 0 then round((pa.responded::numeric / pa.total_orders) * 100, 0) else null end,
         pa.total_orders
    from per_agency pa;
end;
$$;

grant execute on function public.agency_response_stats(uuid) to authenticated, anon;
grant execute on function public.agency_response_stats_batch(uuid[]) to authenticated, anon;