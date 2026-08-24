import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

// Post a review for a completed order. One review per order.
export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`review:${user.id}`, 5, 300)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const orderId = cleanText(body.orderId, 80)
  const rating = Number(body.rating)
  const comment = cleanText(body.comment, 2000)

  if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonError('Order id and a rating between 1 and 5 are required')
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, status, service_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return jsonError('Order not found', 404)
  if (order.buyer_id !== user.id) return jsonError('Not authorized for this order', 403)
  if (order.status !== 'completed') return jsonError('Orders can only be reviewed after completion')

  const { data: existing } = await supabase.from('reviews').select('id').eq('order_id', orderId).maybeSingle()
  if (existing) return jsonError('This order has already been reviewed')

  const { error } = await supabase.from('reviews').insert({
    order_id: orderId,
    service_id: order.service_id,
    author_id: user.id,
    rating,
    comment: comment || null,
  })
  if (error) return jsonError('Unable to submit review', 400)
  return NextResponse.json({ ok: true }, { status: 201 })
}