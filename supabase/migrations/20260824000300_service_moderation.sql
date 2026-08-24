-- =====================================================================
-- TTX Service Moderation
-- Built on the existing schema (services, admin_reviews).
--
-- NOTE: Applied on top of prior migrations. Only ADDS objects.
-- Idempotent (create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Atomic service review RPC
--    decision: 'approved' | 'rejected'
--    Atomically updates services.status and inserts an admin_reviews row.
-- ---------------------------------------------------------------------
create or replace function public.review_service(
  p_service_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_status text;
begin
  select * into v_service from public.services where id = p_service_id;
  if v_service is null then
    return jsonb_build_object('ok', false, 'error', 'Service not found');
  end if;

  if p_decision = 'approved' then
    v_status := 'published';
  elsif p_decision = 'rejected' then
    v_status := 'rejected';
  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  update public.services set status = v_status, updated_at = now() where id = p_service_id;

  insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
  values ('service', p_service_id, p_reviewer_id, p_decision, p_note);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

grant execute on function public.review_service(uuid, text, uuid, text) to authenticated;
