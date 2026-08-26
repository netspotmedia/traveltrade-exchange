import { NextResponse } from 'next/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'
import { initializePaystack } from '@/lib/paystack'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`escrow_init:${user.id}`, 10, 300)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const orderId = cleanText(body.orderId, 80)
  const amount = Number(body.amount)
  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    return jsonError('Order id and a valid amount are required')
  }

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id,status,buyer_id,total_amount,currency')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return jsonError('Order not found', 404)
  if (order.buyer_id !== user.id) return jsonError('Not authorized for this order', 403)
  if (order.status !== 'proposed') return jsonError('Order cannot be funded from its current status')
  if (Math.abs(Number(order.total_amount) - amount) > 0.01) {
    return jsonError('Amount must match the order total')
  }

  // Mirror the wallet funding gate: if this order has an agreement, both
  // parties must have signed before escrow can be funded by card.
  const { data: agreement } = await supabase
    .from('agreements')
    .select('signed_by_buyer_at, signed_by_seller_at')
    .eq('order_id', orderId)
    .maybeSingle()
  if (agreement && (!agreement.signed_by_buyer_at || !agreement.signed_by_seller_at)) {
    return jsonError('Both parties must sign the agreement before funding', 400)
  }

  const reference = `ttx_customer_escrow_${user.id}_${crypto.randomUUID()}`
  const { error: insertError } = await supabase.from('customer_escrow_payments').insert({
    order_id: orderId,
    user_id: user.id,
    reference,
    amount,
    currency: order.currency ?? 'NGN',
    status: 'pending',
  })
  if (insertError) return jsonError('Unable to start payment', 500)

  try {
    const result = await initializePaystack({
      email: user.email ?? '',
      amountNaira: amount,
      reference,
      callbackUrl: `${new URL(request.url).origin}/api/payments/callback`,
      metadata: { type: 'customer_escrow', user_id: user.id, order_id: orderId },
    })
    if (!result.configured) {
      return jsonError('Paystack is not configured', 503)
    }
    return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference })
  } catch {
    return jsonError('Unable to initialize payment', 502)
  }
}
