import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'
import { logAudit } from '@/lib/server/audit'
import { sendNotification } from '@/lib/server/notify'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_verification:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId : ''
  const decision = body.decision
  const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.slice(0, 2000) : null

  if (!submissionId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Submission id and a valid decision are required' }, { status: 400 })
  }

  const { data: sub } = await supabase
    .from('verification_submissions')
    .select('id, agency_id, type, status')
    .eq('id', submissionId)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const { data, error } = await supabase.rpc('review_verification_submission', {
    p_submission_id: submissionId,
    p_decision: decision === 'approve' ? 'approved' : 'rejected',
    p_reviewer_id: user.id,
    p_rejection_reason: rejectionReason,
  })
  if (error || !data?.ok) {
    return NextResponse.json({ error: data?.error ?? 'Unable to process review' }, { status: 400 })
  }

  void logAudit('verification_review', 'verification_submission', submissionId, { decision, type: sub.type })

  // Notify the agency owner.
  const { data: agency } = await supabase.from('agencies').select('owner_id, name').eq('id', sub.agency_id).maybeSingle()
  if (agency) {
    const typeLabel = sub.type === 'kyb' ? 'KYB (business)' : sub.type.toUpperCase()
    void sendNotification({
      userId: agency.owner_id,
      title: decision === 'approve' ? `${typeLabel} verification approved` : `${typeLabel} verification not approved`,
      body:
        decision === 'approve'
          ? `Your ${typeLabel} verification for "${agency.name}" has been approved.`
          : `Your ${typeLabel} verification was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      event: 'verification',
    })
  }

  return NextResponse.json({ ok: true, status: decision === 'approve' ? 'approved' : 'rejected' })
}