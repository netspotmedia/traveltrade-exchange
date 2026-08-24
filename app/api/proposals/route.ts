import { NextResponse } from 'next/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user, agency, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`proposal:${user!.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const orderId = cleanText(body.orderId, 80)
  const feeAmount = Number(body.feeAmount)
  const timelineDays = Number(body.timelineDays)
  const note = cleanText(body.note, 2000)
  const parentProposalId = typeof body.parentProposalId === 'string' ? body.parentProposalId : null
  const milestones = Array.isArray(body.milestones) ? body.milestones : []

  if (!orderId || !Number.isFinite(feeAmount) || feeAmount <= 0) {
    return jsonError('Order id and a valid fee are required')
  }
  if (milestones.length === 0) return jsonError('At least one milestone is required')

  // Verify the agency owns the order's agency and the order is still open.
  const { data: order } = await supabase
    .from('orders')
    .select('id, agency_id, status, buyer_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return jsonError('Order not found', 404)
  if (order.agency_id !== agency!.id) return jsonError('Not authorized for this order', 403)
  if (order.status !== 'proposed') return jsonError('Order is no longer open for proposals')

  // Validate milestone amounts sum to the fee.
  let sum = 0
  const milestoneRows: { title: string; amount: number }[] = []
  for (const m of milestones) {
    const title = cleanText(m?.title, 200)
    const amount = Number(m?.amount)
    if (!title || !Number.isFinite(amount) || amount <= 0) return jsonError('Each milestone needs a title and a positive amount')
    sum += amount
    milestoneRows.push({ title, amount: Math.round(amount * 100) / 100 })
  }
  if (Math.abs(sum - feeAmount) > 0.01) return jsonError('Milestone amounts must add up to the fee')

  const isCounter = Boolean(parentProposalId)
  const status = isCounter ? 'countered' : 'submitted'

  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .insert({
      order_id: orderId,
      agency_id: agency!.id,
      parent_proposal_id: parentProposalId,
      fee_amount: Math.round(feeAmount * 100) / 100,
      timeline_days: Number.isFinite(timelineDays) && timelineDays > 0 ? Math.floor(timelineDays) : null,
      note: note || null,
      status,
    })
    .select('id')
    .single()
  if (proposalError) return jsonError('Unable to create proposal', 400)

  // Create milestones for this order (replace previous proposal's milestones).
  const { error: delError } = await supabase.from('milestones').delete().eq('order_id', orderId)
  if (delError) return jsonError('Unable to reset milestones', 400)
  const { error: insError } = await supabase.from('milestones').insert(
    milestoneRows.map((m) => ({ order_id: orderId, title: m.title, amount: m.amount, status: 'pending' })),
  )
  if (insError) return jsonError('Unable to save milestones', 400)

  // Update order total to the proposed fee.
  await supabase.from('orders').update({ total_amount: Math.round(feeAmount * 100) / 100, updated_at: new Date().toISOString() }).eq('id', orderId)

  // If this is a counter, mark the parent proposal as countered.
  if (parentProposalId) {
    await supabase.from('proposals').update({ status: 'countered', updated_at: new Date().toISOString() }).eq('id', parentProposalId)
  }

  return NextResponse.json({ proposal }, { status: 201 })
}
