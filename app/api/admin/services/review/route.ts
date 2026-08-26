import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { sendNotification } from '@/lib/server/notify'
import { mfaGate } from '@/lib/server/mfa'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`admin_service:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : ''
  const decision = body.decision
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null

  if (!serviceId || !['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Service id and a valid decision are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('review_service', {
    p_service_id: serviceId,
    p_decision: decision,
    p_reviewer_id: user.id,
    p_note: note,
  })
  if (error || !data?.ok) {
    return NextResponse.json({ error: data?.error ?? 'Unable to process review' }, { status: 400 })
  }

  // Notify the owning agency.
  const { data: service } = await supabase.from('services').select('title, agency_id').eq('id', serviceId).maybeSingle()
  if (service) {
    const { data: agency } = await supabase.from('agencies').select('owner_id').eq('id', service.agency_id).maybeSingle()
    if (agency) {
      void sendNotification({
        userId: agency.owner_id,
        title: decision === 'approved' ? 'Service published' : 'Service not approved',
        body: decision === 'approved' ? `Your service "${service.title}" is now live on the marketplace.` : `Your service "${service.title}" was not approved.${note ? ` Reason: ${note}` : ''}`,
        event: 'service_review',
      })
    }
  }

  return NextResponse.json({ ok: true, status: data.status })
}
