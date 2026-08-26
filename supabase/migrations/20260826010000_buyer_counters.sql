-- ---------------------------------------------------------------------
-- Buyer counter-offers
-- 1. Track who created each proposal (buyer vs seller) so the UI/API can
--    route the next move to the right party.
-- 2. Allow the buyer of an order to insert a counter-offer proposal
--    (mirrors the existing agency-owner insert policy).
-- ---------------------------------------------------------------------

-- Track the creator of each proposal.
alter table public.proposals add column if not exists created_by uuid references public.profiles(id);

-- Backfill: existing proposals were all created by the seller (the owner of
-- the order's agency), since buyer counters did not exist before.
update public.proposals p
   set created_by = (select a.owner_id from public.agencies a where a.id = p.agency_id)
 where p.created_by is null;

-- Allow the buyer of an order to insert a counter-offer proposal for it.
drop policy if exists proposals_buyer_insert on public.proposals;
create policy proposals_buyer_insert on public.proposals
  for insert
  with check (auth.uid() in (
    select buyer_id from public.orders where id = order_id
  ));
