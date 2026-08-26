import { NextResponse } from 'next/server'
import { requireUser, requireVerifiedEmail, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const emailGate = await requireVerifiedEmail()
  if (emailGate) return emailGate

  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`proposal_respond:${user.id}`, 20, 60)
  if (!allowed.allowed) return rateLimitError()

  const { id } = await params
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const decision = body.decision

  if (!['accept', 'reject'].includes(decision)) return jsonError('Decision must be accept or reject')

  const { data: proposal } = await supabase.from('proposals').select('*, orders(buyer_id, status, currency)').eq('id', id).maybeSingle()
  if (!proposal) return jsonError('Proposal not found', 404)
  const order = Array.isArray(proposal.orders) ? proposal.orders[0] : proposal.orders
  if (!order || order.buyer_id !== user.id) return jsonError('Not authorized for this proposal', 403)
  if (order.status !== 'proposed') return jsonError('Order is no longer open')
  if (proposal.status === 'accepted') return jsonError('Proposal already accepted')
  if (proposal.status === 'rejected' || proposal.status === 'declined') {
    return jsonError('This proposal has already been decided and can no longer be acted on')
  }

  const next = decision === 'accept' ? 'accepted' : 'rejected'
  const { error } = await supabase.from('proposals').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return jsonError('Unable to update proposal', 400)

  // Accepting a proposal creates the agreement and records the buyer's
  // signature. The seller signs from the order page before escrow funding.
  if (decision === 'accept') {
    await supabase.from('agreements').upsert(
      {
        order_id: proposal.order_id,
        proposal_id: id,
        total_amount: Number(proposal.fee_amount ?? 0),
        currency: order?.currency ?? 'NGN',
        signed_by_buyer_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' },
    )
  }

  return NextResponse.json({ ok: true, status: next })
}
