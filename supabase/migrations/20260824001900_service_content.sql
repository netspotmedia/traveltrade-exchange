-- =====================================================================
-- TTX Service Content, Images & Agency Credentials
-- Adds structured service content (details/faqs/images), a public
-- service-images storage bucket, an agency credentials column for
-- verification badges, and an admin RPC to set those credentials.
--
-- NOTE: Additive + idempotent. Does not touch money/order logic.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. services: structured content + images (additive columns)
--    details: { included: text[], requirements: text[], delivery: text }
--    faqs:    [{ question: text, answer: text }]
--    images:  text[] of storage paths in the 'service-images' bucket
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'details') then
    alter table public.services add column details jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'faqs') then
    alter table public.services add column faqs jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'images') then
    alter table public.services add column images jsonb not null default '[]'::jsonb;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. agencies: credentials confirmed during KYB review
--    verifications: text[] e.g. ['cac','nanta','iata']
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agencies' and column_name = 'verifications') then
    alter table public.agencies add column verifications jsonb not null default '[]'::jsonb;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Public service-images bucket (product images are public; this is
--    NOT the private verification-documents bucket).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

create policy "service_images_upload_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'service-images');

create policy "service_images_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'service-images');

create policy "service_images_delete_authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'service-images');

-- ---------------------------------------------------------------------
-- 4. Admin-only RPC to record verified credentials on an agency.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_agency_credentials(
  p_agency_id uuid,
  p_credentials text[],
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
  update public.agencies
     set verifications = coalesce(p_credentials, '{}'::text[])
   where id = p_agency_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_agency_credentials(uuid, text[], uuid) to authenticated;