import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { sendNotification } from '@/lib/server/notify'
import { mfaGate } from '@/lib/server/mfa'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_kyb:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const agencyId = typeof body.agencyId === 'string' ? body.agencyId : ''
  const decision = body.decision
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null

  if (!agencyId || !['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Agency id and a valid decision are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('review_agency_kyb', {
    p_agency_id: agencyId,
    p_decision: decision,
    p_reviewer_id: user.id,
    p_note: note,
  })
  if (error || !data?.ok) {
    return NextResponse.json({ error: data?.error ?? 'Unable to process review' }, { status: 400 })
  }

  // Notify the agency owner.
  const { data: agency } = await supabase.from('agencies').select('owner_id, name').eq('id', agencyId).maybeSingle()
  if (agency) {
    void sendNotification({
      userId: agency.owner_id,
      title: decision === 'approved' ? 'Agency verified' : 'Agency application not approved',
      body: decision === 'approved' ? `Your agency "${agency.name}" has been verified. You can now sell services.` : `Your agency "${agency.name}" was not approved.${note ? ` Reason: ${note}` : ''}`,
      event: 'agency_verification',
    })
  }

  return NextResponse.json({ ok: true, status: data.status })
}
