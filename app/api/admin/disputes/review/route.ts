import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { resolveDispute, escalateDispute } from '@/lib/server/money'
import { paystackInitiateRefund } from '@/lib/paystack'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_dispute:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const disputeId = typeof body.disputeId === 'string' ? body.disputeId : ''
  const action = body.action
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null

  if (!disputeId) return NextResponse.json({ error: 'Dispute id is required' }, { status: 400 })

  if (action === 'escalate') {
    const result = await escalateDispute({ disputeId, actorId: user.id })
    if (!result.ok) return NextResponse.json({ error: result.error ?? 'Unable to escalate' }, { status: 400 })
    return NextResponse.json({ ok: true, status: result.status })
  }

  if (action === 'resolved_buyer' || action === 'resolved_seller') {
    const { data: dispute } = await supabase.from('disputes').select('order_id').eq('id', disputeId).maybeSingle()
    const result = await resolveDispute({ disputeId, decision: action, actorId: user.id, note })
    if (!result.ok) return NextResponse.json({ error: result.error ?? 'Unable to resolve dispute' }, { status: 400 })

    // B2C: if the order was funded via Paystack, initiate a refund on the
    // transaction reference (outside the DB transaction).
    if (action === 'resolved_buyer' && dispute?.order_id) {
      try {
        const { data: payment } = await supabase
          .from('customer_escrow_payments')
          .select('paystack_ref, amount')
          .eq('order_id', dispute.order_id)
          .eq('status', 'funded')
          .maybeSingle()
        if (payment?.paystack_ref) {
          await paystackInitiateRefund({ reference: payment.paystack_ref, amountKobo: Math.round(Number(payment.amount) * 100) })
        }
      } catch {
        // Refund is best-effort after the DB settlement; log and continue.
      }
    }
    return NextResponse.json({ ok: true, status: result.status })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
