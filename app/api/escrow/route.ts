import { NextResponse } from 'next/server'
import { requireUser, cleanText, jsonError } from '@/lib/server/workflows'

const transitions = { submit: { from: ['in_progress', 'funded'], to: 'delivered' }, approve: { from: ['delivered'], to: 'completed' }, dispute: { from: ['proposed', 'funded', 'in_progress', 'delivered'], to: 'disputed' } } as const

export async function POST(request: Request) {
  const { supabase, user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)
  const body = await request.json().catch(() => ({}))
  const action = body.action as keyof typeof transitions
  const orderId = cleanText(body.orderId, 80)
  if (!orderId || !transitions[action]) return jsonError('Invalid escrow action')
  const { data: order, error: readError } = await supabase.from('orders').select('id,status,buyer_id,agency_id,agencies(owner_id)').eq('id', orderId).maybeSingle()
  if (readError || !order) return jsonError('Order not found', 404)
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === agency?.owner_id
  if (!isBuyer && !isSeller) return jsonError('Not authorized for this order', 403)
  if (action === 'submit' && !isSeller) return jsonError('Only the seller can submit delivery', 403)
  if (action === 'approve' && !isBuyer) return jsonError('Only the buyer can approve delivery', 403)
  if (action === 'dispute' && !isBuyer && !isSeller) return jsonError('Not authorized', 403)
  const transition = transitions[action]
  if (!(transition.from as readonly string[]).includes(order.status)) return jsonError(`Order cannot transition from ${order.status}`)
  const { error } = await supabase.from('orders').update({ status: transition.to, updated_at: new Date().toISOString() }).eq('id', orderId).eq('status', order.status)
  if (error) return jsonError('Unable to update escrow state', 409)
  if (action === 'dispute') await supabase.from('disputes').insert({ order_id: orderId, opened_by: user.id, reason: cleanText(body.reason, 2000) || 'Order dispute opened' })
  return NextResponse.json({ status: transition.to })
}
