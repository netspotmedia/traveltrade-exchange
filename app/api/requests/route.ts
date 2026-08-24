import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`request_quote:${user.id}`, 20, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const serviceId = cleanText(body.serviceId, 80)
  const title = cleanText(body.title, 200) || 'Quote request'

  if (!serviceId) return jsonError('Service id is required')

  const { data: service } = await supabase
    .from('services')
    .select('id, title, agency_id, status, ordering_mode')
    .eq('id', serviceId)
    .maybeSingle()
  if (!service) return jsonError('Service not found', 404)
  if (service.status !== 'published') return jsonError('Service is not available')
  if (service.ordering_mode === 'instant_order') {
    return jsonError('This service is available for instant ordering, not quote requests', 400)
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      agency_id: service.agency_id,
      service_id: service.id,
      title: `${title} — ${service.title}`,
      total_amount: 0,
      currency: 'NGN',
      status: 'proposed',
    })
    .select('id, title')
    .single()
  if (error) return jsonError('Unable to create quote request', 400)

  return NextResponse.json({ order }, { status: 201 })
}
