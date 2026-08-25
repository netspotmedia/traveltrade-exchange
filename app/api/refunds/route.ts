import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, requireVerifiedEmail, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'

// Refundable order states — funds must still be held in escrow.
const REFUNDABLE = ['funded', 'in_progress', 'delivered']

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const emailGate = await requireVerifiedEmail()
  if (emailGate) return emailGate

  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`refund_request:${user.id}`, 10, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const orderId = cleanText(body.orderId, 80)
  const reason = cleanText(body.reason, 2000)

  if (!orderId) return jsonError('Order id is required')

  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, total_amount, status')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return jsonError('Order not found', 404)
  if (order.buyer_id !== user.id) return jsonError('Not authorized for this order', 403)
  if (!REFUNDABLE.includes(order.status)) return jsonError('This order cannot be refunded in its current state')

  // Only allow a refund on escrow that still holds funds.
  const { data: ledger } = await supabase
    .from('escrow_ledger')
    .select('entry_type, amount')
    .eq('order_id', orderId)
  const funded = (ledger ?? []).filter((l) => l.entry_type === 'fund').reduce((s, l) => s + Number(l.amount ?? 0), 0)
  const released = (ledger ?? []).filter((l) => l.entry_type === 'release').reduce((s, l) => s + Number(l.amount ?? 0), 0)
  const remaining = funded - released
  if (remaining <= 0) return jsonError('No escrow funds remain to refund')

  const { error } = await supabase.from('refund_requests').insert({
    order_id: orderId,
    requester_id: user.id,
    amount: Math.round(remaining * 100) / 100,
    reason: reason || null,
  })
  if (error) return jsonError('Unable to submit refund request', 400)

  return NextResponse.json({ ok: true }, { status: 201 })
}