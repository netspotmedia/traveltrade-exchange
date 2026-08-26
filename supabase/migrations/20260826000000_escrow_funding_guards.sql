-- ---------------------------------------------------------------------
-- Escrow funding guards
-- 1. Prevent two pending card payments for the same order (unique partial
--    index), so a buyer cannot open two Paystack charges for one order.
-- 2. Defensive order-level funding check inside complete_customer_escrow,
--    so a webhook for a different reference can never double-credit escrow
--    even if two pending rows somehow exist (e.g. rows created before this
--    index was added).
-- ---------------------------------------------------------------------

-- Only one pending card payment per order. Once it completes (status ->
-- 'funded'), the order moves to 'funded' and escrow/initialize rejects it
-- via the status gate, so a fresh pending row cannot be created.
create unique index if not exists customer_escrow_payments_one_pending_per_order
  on public.customer_escrow_payments (order_id)
  where status = 'pending';

-- Recreate complete_customer_escrow with a defensive order-level guard.
create or replace function public.complete_customer_escrow(
  p_reference text,
  p_amount numeric,
  p_currency text default 'NGN'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.customer_escrow_payments%rowtype;
  v_order public.orders%rowtype;
  v_idem text := 'fund:' || p_reference;
  v_wallet_id uuid;
  v_new_escrow numeric;
  v_available numeric;
begin
  select * into v_payment from public.customer_escrow_payments where reference = p_reference;
  if v_payment is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown payment reference');
  end if;

  -- Idempotency: already funded?
  if v_payment.status = 'funded' then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  -- Cross-check amount (Paystack confirmed amount must match what we quoted).
  if p_amount <> v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Amount mismatch');
  end if;

  select * into v_order from public.orders where id = v_payment.order_id;
  if v_order is null then
    return jsonb_build_object('ok', false, 'error', 'Order not found');
  end if;

  -- Defensive: never double-fund an order. If escrow is already funded for
  -- this order (via a different reference), treat this as already processed
  -- and just mark this payment row funded.
  if exists (
    select 1 from public.escrow_ledger
    where order_id = v_order.id and entry_type = 'fund'
  ) then
    update public.customer_escrow_payments
       set status = 'funded', paystack_ref = p_reference, updated_at = now()
     where id = v_payment.id;
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  if exists (select 1 from public.escrow_ledger where idempotency_key = v_idem) then
    -- Belt-and-suspenders: escrow already recorded, mark payment funded.
    update public.customer_escrow_payments
       set status = 'funded', updated_at = now()
     where id = v_payment.id;
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  v_wallet_id := public.ensure_wallet(v_payment.user_id);

  -- For B2C card funding we hold the funds in the buyer's escrow balance
  -- (no available-balance debit since money came from the card).
  select available_balance, escrow_balance into v_available, v_new_escrow
    from public.wallets where id = v_wallet_id;
  v_new_escrow := v_new_escrow + v_payment.amount;

  update public.wallets
     set escrow_balance = v_new_escrow,
         updated_at = now()
   where id = v_wallet_id;

  insert into public.escrow_ledger (
    order_id, actor_id, entry_type, amount, currency, idempotency_key
  ) values (
    v_order.id, v_payment.user_id, 'fund', v_payment.amount, p_currency, v_idem
  );

  -- Reflect the escrow hold on the buyer wallet ledger too.
  insert into public.wallet_ledger (
    wallet_id, actor_id, entry_type, amount, balance_after, provider_reference, idempotency_key
  ) values (
    v_wallet_id, v_payment.user_id, 'escrow_hold', v_payment.amount, v_new_escrow,
    p_reference, 'hold:' || p_reference
  );

  update public.orders set status = 'funded', updated_at = now() where id = v_order.id;

  update public.customer_escrow_payments
     set status = 'funded', paystack_ref = p_reference, updated_at = now()
   where id = v_payment.id;

  return jsonb_build_object('ok', true);
end;
$$;
