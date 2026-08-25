-- =====================================================================
-- TTX Verification Submissions
-- Adds a multi-type verification workflow (KYB / NANTA / IATA) on top of
-- the existing agencies + kyc_documents tables, mirroring TTX Next's
-- VerificationSubmission model. Additive and non-breaking: the existing
-- single onboarding upload (kyc_documents) is untouched and remains the
-- KYB entry point.
--
-- SAFETY: Additive only. create table if not exists, create or replace
-- function. Does not modify existing tables.
-- =====================================================================

create table if not exists public.verification_submissions (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid not null references public.agencies (id) on delete cascade,
  type             text not null check (type in ('kyb','nanta','iata')),
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_data   jsonb not null default '{}'::jsonb,
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists verification_submissions_agency_idx on public.verification_submissions (agency_id);
create index if not exists verification_submissions_type_idx on public.verification_submissions (type);
create index if not exists verification_submissions_status_idx on public.verification_submissions (status);

-- Submission documents (storage path + original name + size).
create table if not exists public.verification_documents (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.verification_submissions (id) on delete cascade,
  doc_type      text not null default 'document',
  storage_path  text not null,
  original_name text,
  mime_type     text,
  file_size     integer,
  created_at    timestamptz not null default now()
);

create index if not exists verification_documents_submission_idx on public.verification_documents (submission_id);

-- ---------------------------------------------------------------------
-- Admin review of a verification submission.
--   approved:
--     kyb   -> agencies.verification_status = 'verified', owner role -> seller,
--              verifications[] gets 'cac'
--     nanta -> verifications[] gets 'nanta'
--     iata  -> verifications[] gets 'iata'
--   rejected: status = 'rejected' + rejection_reason; no field changes.
-- ---------------------------------------------------------------------
create or replace function public.review_verification_submission(
  p_submission_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_rejection_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.verification_submissions%rowtype;
  v_agency public.agencies%rowtype;
  v_role text;
  v_creds text[];
begin
  select role into v_role from public.profiles where id = p_reviewer_id;
  if v_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required');
  end if;

  select * into v_sub from public.verification_submissions where id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('ok', false, 'error', 'Submission not found');
  end if;
  if v_sub.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Submission already reviewed');
  end if;
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'Decision must be approved or rejected');
  end if;

  select * into v_agency from public.agencies where id = v_sub.agency_id;

  if p_decision = 'rejected' then
    update public.verification_submissions
       set status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = now(),
           rejection_reason = p_rejection_reason, updated_at = now()
     where id = p_submission_id;
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  -- Approved.
  v_creds := coalesce(v_agency.verifications, '{}'::text[]);

  if v_sub.type = 'kyb' then
    update public.agencies set verification_status = 'verified' where id = v_sub.agency_id;
    update public.profiles set role = 'seller' where id = v_agency.owner_id;
    if not ('cac' = any(v_creds)) then v_creds := v_creds || 'cac'; end if;
  elsif v_sub.type = 'nanta' then
    if not ('nanta' = any(v_creds)) then v_creds := v_creds || 'nanta'; end if;
  elsif v_sub.type = 'iata' then
    if not ('iata' = any(v_creds)) then v_creds := v_creds || 'iata'; end if;
  end if;

  update public.agencies set verifications = v_creds where id = v_sub.agency_id;

  update public.verification_submissions
     set status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now(), updated_at = now()
   where id = p_submission_id;

  return jsonb_build_object('ok', true, 'status', 'approved');
end;
$$;

-- ---------------------------------------------------------------------
-- RLS — agency reads own submissions + docs; admins read all; writes are
-- server-side via the API.
-- ---------------------------------------------------------------------
alter table public.verification_submissions enable row level security;
alter table public.verification_documents enable row level security;

drop policy if exists verification_submissions_select on public.verification_submissions;
create policy verification_submissions_select on public.verification_submissions
  for select
  using (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
    union
    select id from public.profiles where role = 'admin'
  ));

drop policy if exists verification_submissions_agency_insert on public.verification_submissions;
create policy verification_submissions_agency_insert on public.verification_submissions
  for insert
  with check (auth.uid() in (
    select owner_id from public.agencies where id = agency_id
  ));

drop policy if exists verification_submissions_admin_update on public.verification_submissions;
create policy verification_submissions_admin_update on public.verification_submissions
  for update
  using (auth.uid() in (select id from public.profiles where role = 'admin'));

drop policy if exists verification_documents_select on public.verification_documents;
create policy verification_documents_select on public.verification_documents
  for select
  using (auth.uid() in (
    select a.owner_id from public.verification_submissions s
    join public.agencies a on a.id = s.agency_id
    where s.id = submission_id
    union
    select id from public.profiles where role = 'admin'
  ));

drop policy if exists verification_documents_agency_insert on public.verification_documents;
create policy verification_documents_agency_insert on public.verification_documents
  for insert
  with check (auth.uid() in (
    select a.owner_id from public.verification_submissions s
    join public.agencies a on a.id = s.agency_id
    where s.id = submission_id
  ));

grant select, insert on public.verification_submissions to authenticated;
grant update on public.verification_submissions to authenticated;
grant select, insert on public.verification_documents to authenticated;
grant execute on function public.review_verification_submission(uuid, text, uuid, text) to authenticated;