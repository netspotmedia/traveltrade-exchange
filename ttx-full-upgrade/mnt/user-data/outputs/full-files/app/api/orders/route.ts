import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`orders:${user.id}`, 20, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const title = cleanText(body.title, 200)
  const agencyId = cleanText(body.agencyId, 80)
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : null
  const requestedAmount = Number(body.totalAmount)
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : crypto.randomUUID()

  if (!title || !agencyId || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return jsonError('Invalid order details')
  }

  // If this exact request already went through (retry, resubmit), hand back
  // the order that was already created instead of failing on the unique
  // constraint or creating a duplicate.
  const { data: existing } = await supabase
    .from('orders')
    .select('id, title')
    .eq('idempotency_key', idempotencyKey)
    .eq('buyer_id', user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ order: existing }, { status: 200 })
  }

  // Instant-order guard: the service must be published and set to instant_order.
  if (serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('id, agency_id, base_price, status, ordering_mode')
      .eq('id', serviceId)
      .is('deleted_at', null)
      .maybeSingle()
    if (!service) return jsonError('Service not found', 404)
    if (service.status !== 'published') return jsonError('Service is not available')
    if (service.ordering_mode !== 'instant_order') {
      return jsonError('This service requires a quote. Use "Request a quote" instead.', 400)
    }
    if (service.agency_id !== agencyId) return jsonError('Service does not belong to this agency', 400)
    if (Math.abs(Number(service.base_price) - requestedAmount) > 0.01) {
      return jsonError('Amount must match the service price')
    }
  }

  // Create the order (status proposed). For instant orders, create a single
  // milestone for the full amount so the funded escrow can be released.
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      agency_id: agencyId,
      service_id: serviceId,
      title,
      total_amount: Math.round(requestedAmount * 100) / 100,
      idempotency_key: idempotencyKey,
      status: 'proposed',
    })
    .select('id')
    .single()
  if (error) return jsonError('Unable to create order', 400)

  const { error: milError } = await supabase.from('milestones').insert({
    order_id: order.id,
    title: title,
    amount: Math.round(requestedAmount * 100) / 100,
    status: 'pending',
  })
  if (milError) return jsonError('Order created but milestone setup failed', 500)

  return NextResponse.json({ order }, { status: 201 })
}
