import { NextResponse } from 'next/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

// Scale a set of milestone amounts proportionally to a new target total, so
// the milestone breakdown keeps the same structure but sums to the new fee.
// The last milestone absorbs any rounding remainder so the sum is exact.
function scaleMilestones(rows: { title: string; amount: number }[], target: number): { title: string; amount: number }[] {
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  if (total <= 0 || rows.length === 0) return []
  const result = rows.map((r) => ({ title: r.title, amount: (Number(r.amount) / total) * target }))
  const sum = result.reduce((s, r) => s + r.amount, 0)
  result[result.length - 1].amount = result[result.length - 1].amount + (target - sum)
  return result.map((r) => ({ title: r.title, amount: Math.round(r.amount * 100) / 100 }))
}

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`proposal:${user.id}`, 30, 60)
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

  // Load the order plus its agency so we can authorize either party.
  const { data: order } = await supabase
    .from('orders')
    .select('id, agency_id, status, buyer_id, agencies(id, owner_id, verification_status)')
    .eq('id', orderId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return jsonError('Order not found', 404)
  if (order.status !== 'proposed') return jsonError('Order is no longer open for proposals')

  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  const isSeller = Boolean(agency) && user.id === agency.owner_id && agency.verification_status === 'verified'
  const isBuyer = user.id === order.buyer_id
  if (!isSeller && !isBuyer) return jsonError('Not authorized for this order', 403)

  // A counter-offer must reference an existing proposal (the other party's).
  const isCounter = Boolean(parentProposalId)
  const status = isCounter ? 'countered' : 'submitted'

  let milestoneRows: { title: string; amount: number }[]

  if (isSeller) {
    // Sellers define the milestone breakdown directly and always supply it.
    if (milestones.length === 0) return jsonError('At least one milestone is required')
    milestoneRows = []
    let sum = 0
    for (const m of milestones) {
      const title = cleanText(m?.title, 200)
      const amount = Number(m?.amount)
      if (!title || !Number.isFinite(amount) || amount <= 0) return jsonError('Each milestone needs a title and a positive amount')
      sum += amount
      milestoneRows.push({ title, amount: Math.round(amount * 100) / 100 })
    }
    if (milestoneRows.length > 0 && Math.abs(sum - feeAmount) > 0.01) {
      return jsonError('Milestone amounts must add up to the fee')
    }
  } else {
    // Buyer counters adjust the total price; the seller's milestone structure
    // is rescaled proportionally so funding stays consistent.
    if (!parentProposalId) return jsonError('A proposal to counter is required', 400)
    const { data: existing } = await supabase
      .from('milestones')
      .select('title, amount')
      .eq('order_id', orderId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    milestoneRows = scaleMilestones((existing ?? []) as { title: string; amount: number }[], feeAmount)
    if (milestoneRows.length === 0) {
      milestoneRows = [{ title: 'Full amount', amount: Math.round(feeAmount * 100) / 100 }]
    }
  }

  // Create the proposal. The agency is always the order's agency; created_by
  // records which party proposed (buyer or seller).
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .insert({
      order_id: orderId,
      agency_id: order.agency_id,
      parent_proposal_id: parentProposalId,
      created_by: user.id,
      fee_amount: Math.round(feeAmount * 100) / 100,
      timeline_days: Number.isFinite(timelineDays) && timelineDays > 0 ? Math.floor(timelineDays) : null,
      note: note || null,
      status,
    })
    .select('id')
    .single()
  if (proposalError) return jsonError('Unable to create proposal', 400)

  // Replace the order's milestones with this proposal's plan.
  const { error: delError } = await supabase.from('milestones').delete().eq('order_id', orderId).is('deleted_at', null)
  if (delError) return jsonError('Unable to reset milestones', 400)
  const { error: insError } = await supabase.from('milestones').insert(
    milestoneRows.map((m) => ({ order_id: orderId, title: m.title, amount: m.amount, status: 'pending' })),
  )
  if (insError) return jsonError('Unable to save milestones', 400)

  // Update the order total to the proposed fee.
  await supabase.from('orders').update({ total_amount: Math.round(feeAmount * 100) / 100, updated_at: new Date().toISOString() }).eq('id', orderId)

  // If this is a counter, mark the referenced proposal as countered.
  if (parentProposalId) {
    await supabase.from('proposals').update({ status: 'countered', updated_at: new Date().toISOString() }).eq('id', parentProposalId)
  }

  return NextResponse.json({ proposal }, { status: 201 })
}
