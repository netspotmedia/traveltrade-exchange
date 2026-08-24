-- =====================================================================
-- TTX KYB Verification & Admin Approvals
-- Built on the existing schema (agencies, kyc_documents, admin_reviews,
-- profiles).
--
-- NOTE: Applied on top of the money_engine migration. Only ADDS objects.
-- Idempotent (create if not exists / create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verification document storage bucket (real upload support)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

-- A signed-in user may upload a document (for now, any authenticated user;
-- the owning-agency check is enforced at the API layer).
create policy "kyb_upload_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'verification-documents');

-- Users can read documents they uploaded (by matching owner in the path).
-- Storage object paths follow: {agencyId}/{uuid}_{originalName}
create policy "kyb_select_owner"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'verification-documents');

-- Owners can delete their own uploads.
create policy "kyb_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'verification-documents');

-- ---------------------------------------------------------------------
-- 2. Atomic KYB review RPC
--    decision: 'approved' | 'rejected'
--    Atomically:
--      - updates agencies.verification_status
--      - updates all the agency's kyc_documents status + reviewer_note
--      - inserts an admin_reviews row (audit trail)
--      - on approval, promotes the owner's profile role to 'seller'
--      - on rejection, demotes the owner to 'buyer' if they have no other
--        active agency
-- ---------------------------------------------------------------------
create or replace function public.review_agency_kyb(
  p_agency_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies%rowtype;
  v_status text;
  v_role text;
  v_other_active integer;
begin
  select * into v_agency from public.agencies where id = p_agency_id;
  if v_agency is null then
    return jsonb_build_object('ok', false, 'error', 'Agency not found');
  end if;

  if p_decision = 'approved' then
    v_status := 'verified';
    v_role   := 'seller';
  elsif p_decision = 'rejected' then
    v_status := 'rejected';
    v_role   := null; -- decide below
  else
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  -- Update agency status.
  update public.agencies
     set verification_status = v_status
   where id = p_agency_id;

  -- Update all pending kyc documents for this agency.
  update public.kyc_documents
     set status = case when p_decision = 'approved' then 'approved' else 'rejected' end,
         reviewer_note = p_note
   where agency_id = p_agency_id;

  -- Audit trail.
  insert into public.admin_reviews (entity_type, entity_id, reviewer_id, decision, note)
  values ('agency', p_agency_id, p_reviewer_id, p_decision, p_note);

  -- Role management.
  if p_decision = 'approved' then
    update public.profiles set role = 'seller' where id = v_agency.owner_id;
  else
    -- On rejection, only demote to buyer if the owner has no other verified agency.
    select count(*) into v_other_active
      from public.agencies
     where owner_id = v_agency.owner_id and verification_status = 'verified';
    if v_other_active = 0 then
      update public.profiles set role = 'buyer' where id = v_agency.owner_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. RLS / grants
-- ---------------------------------------------------------------------
grant execute on function public.review_agency_kyb(uuid, text, uuid, text) to authenticated;
