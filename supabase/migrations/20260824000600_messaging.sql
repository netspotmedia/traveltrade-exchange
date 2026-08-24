-- =====================================================================
-- TTX Order Messaging
-- Built on the existing schema (order_messages, orders, agencies).
--
-- NOTE: Applied on top of prior migrations. Adds read_at column to
-- order_messages (additive) + RLS + grants. Idempotent.
-- =====================================================================

-- 1. Add read_at column (idempotent).
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_messages' and column_name = 'read_at') then
    alter table public.order_messages add column read_at timestamptz;
  end if;
end $$;

-- 2. Enable RLS on order_messages and let participants read / insert.
alter table public.order_messages enable row level security;

drop policy if exists order_messages_participant_select on public.order_messages;
create policy order_messages_participant_select on public.order_messages
  for select
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

drop policy if exists order_messages_participant_insert on public.order_messages;
create policy order_messages_participant_insert on public.order_messages
  for insert
  with check (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

drop policy if exists order_messages_participant_update on public.order_messages;
create policy order_messages_participant_update on public.order_messages
  for update
  using (auth.uid() in (
    select buyer_id from public.orders where id = order_id
    union
    select owner_id from public.agencies a join public.orders o on o.agency_id = a.id where o.id = order_id
  ));

-- 3. Realtime publication for order_messages (provisioned).
alter publication supabase_realtime add table public.order_messages;

-- 4. Ensure the sending user can only set their own sender_id / body.
revoke all on public.order_messages from anon, authenticated;
grant select, insert, update on public.order_messages to authenticated;
