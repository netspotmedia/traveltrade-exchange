import { NextResponse } from 'next/server'
import { requireUser, requireVerifiedAgent, requireVerifiedEmail, cleanText, jsonError } from '@/lib/server/workflows'
import { mfaGate } from '@/lib/server/mfa'
import {
  fundEscrowFromWallet,
  submitMilestone,
  approveMilestone,
  releaseMilestone,
} from '@/lib/server/money'

// NOTE: 'submit' and 'approve' order-level transitions were removed. They
// used to flip orders.status directly (funded/in_progress -> delivered ->
// completed) without touching the escrow/milestone ledger, which could mark
// an order "completed" while the buyer's money was still sitting in escrow
// and the seller was never paid. Delivery and payout now only happen through
// submitMilestone / approveMilestone / releaseMilestone below, which move
// real money via the security-definer RPCs. 'dispute' is kept here since it
// doesn't move money and applies at the order level.
const orderTransitions = {
  dispute: { from: ['proposed', 'funded', 'in_progress', 'delivered'], to: 'disputed' },
} as const

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const { supabase, user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)
  const body = await request.json().catch(() => ({}))
  const action = cleanText(body.action, 40)

  // ---- Milestone-level actions (money moves through these) ----
  if (action === 'fundMilestone' || action === 'submitMilestone' || action === 'approveMilestone' || action === 'releaseMilestone') {
    const emailGate = await requireVerifiedEmail()
    if (emailGate) return emailGate
    // Submitting delivery is a seller action: requires a verified agency.
    if (action === 'submitMilestone') {
      const gate = await requireVerifiedAgent()
      if (gate.response) return gate.response
    }
    const milestoneId = cleanText(body.milestoneId, 80)
    if (!milestoneId) return jsonError('Milestone id is required')
    const fn =
      action === 'submitMilestone'
        ? submitMilestone
        : action === 'approveMilestone'
          ? approveMilestone
          : action === 'releaseMilestone'
            ? releaseMilestone
            : null
    if (!fn) return jsonError('Invalid action')
    const result = await fn({ milestoneId, actorId: user.id })
    if (!result.ok) return jsonError(result.error ?? 'Unable to complete milestone action', 400)
    return NextResponse.json({ ok: true, result })
  }

  // ---- Order-level escrow funding (B2B wallet -> escrow) ----
  if (action === 'fund') {
    const emailGate = await requireVerifiedEmail()
    if (emailGate) return emailGate
    const orderId = cleanText(body.orderId, 80)
    if (!orderId) return jsonError('Order id is required')

    // If this order has an agreement, both parties must have signed before
    // escrow can be funded. Orders without an agreement (legacy flow) are
    // unaffected.
    const { data: agreement } = await supabase
      .from('agreements')
      .select('signed_by_buyer_at, signed_by_seller_at')
      .eq('order_id', orderId)
      .maybeSingle()
    if (agreement && (!agreement.signed_by_buyer_at || !agreement.signed_by_seller_at)) {
      return jsonError('Both parties must sign the agreement before funding', 400)
    }

    const result = await fundEscrowFromWallet({ orderId, buyerId: user.id })
    if (!result.ok) return jsonError(result.error ?? 'Unable to fund escrow', 400)
    if (agreement) await supabase.from('agreements').update({ status: 'active', updated_at: new Date().toISOString() }).eq('order_id', orderId)
    return NextResponse.json({ ok: true, status: 'funded' })
  }

  // ---- Order-level dispute (the only remaining transition here) ----
  const orderId = cleanText(body.orderId, 80)
  if (!orderId || !(action in orderTransitions)) return jsonError('Invalid escrow action')
  const { data: order, error: readError } = await supabase.from('orders').select('id,status,buyer_id,agency_id,agencies(owner_id)').eq('id', orderId).maybeSingle()
  if (readError || !order) return jsonError('Order not found', 404)
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === agency?.owner_id
  if (!isBuyer && !isSeller) return jsonError('Not authorized for this order', 403)
  const transition = orderTransitions[action as keyof typeof orderTransitions]
  if (!(transition.from as readonly string[]).includes(order.status)) return jsonError(`Order cannot transition from ${order.status}`)
  const { error } = await supabase.from('orders').update({ status: transition.to, updated_at: new Date().toISOString() }).eq('id', orderId).eq('status', order.status)
  if (error) return jsonError('Unable to update escrow state', 409)
  if (action === 'dispute') await supabase.from('disputes').insert({ order_id: orderId, opened_by: user.id, reason: cleanText(body.reason, 2000) || 'Order dispute opened' })
  return NextResponse.json({ status: transition.to })
}
