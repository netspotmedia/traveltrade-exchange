import { NextResponse } from 'next/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user, agency, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`service_submit:${user!.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const serviceId = cleanText(body.serviceId, 80)
  if (!serviceId) return jsonError('Service id is required')

  const { data: service } = await supabase
    .from('services')
    .select('id, agency_id, status')
    .eq('id', serviceId)
    .maybeSingle()
  if (!service) return jsonError('Service not found', 404)
  if (service.agency_id !== agency!.id) return jsonError('Not authorized for this service', 403)
  if (service.status !== 'draft') return jsonError('Only draft services can be submitted for approval')

  const { error } = await supabase
    .from('services')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .eq('status', 'draft')
  if (error) return jsonError('Unable to submit service', 400)

  return NextResponse.json({ ok: true, status: 'pending' })
}
