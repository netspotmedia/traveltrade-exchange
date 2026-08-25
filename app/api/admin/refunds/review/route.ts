import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'
import { refundOrderEscrow } from '@/lib/server/money'
import { sendNotification } from '@/lib/server/notify'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_refund:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const refundId = typeof body.refundId === 'string' ? body.refundId : ''
  const decision = body.decision
  const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.slice(0, 2000) : null

  if (!refundId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Refund id and a valid decision are required' }, { status: 400 })
  }

  const { data: refund } = await supabase
    .from('refund_requests')
    .select('id, order_id, amount, status, requester_id')
    .eq('id', refundId)
    .maybeSingle()
  if (!refund) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })
  if (refund.status !== 'pending') return NextResponse.json({ error: 'Refund request already reviewed' }, { status: 400 })

  const now = new Date().toISOString()

  if (decision === 'approve') {
    // Settle: refund remaining escrow to the buyer, then mark request approved.
    const result = await refundOrderEscrow({ orderId: refund.order_id, actorId: user.id })
    if (!result.ok) return NextResponse.json({ error: result.error ?? 'Unable to process refund' }, { status: 400 })

    const { error } = await supabase
      .from('refund_requests')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: now, updated_at: now })
      .eq('id', refundId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    void sendNotification({
      userId: refund.requester_id,
      title: 'Refund approved',
      body: `Your refund of ₦${Number(refund.amount).toLocaleString()} has been approved and returned to your wallet.`,
      event: 'refund',
    })
  } else {
    const { error } = await supabase
      .from('refund_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_reason: rejectionReason ?? 'Request was declined.',
        updated_at: now,
      })
      .eq('id', refundId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    void sendNotification({
      userId: refund.requester_id,
      title: 'Refund request not approved',
      body: `Your refund request was declined.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      event: 'refund',
    })
  }

  return NextResponse.json({ ok: true, status: decision === 'approve' ? 'approved' : 'rejected' })
}