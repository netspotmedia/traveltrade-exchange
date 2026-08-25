import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, requireVerifiedEmail, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'
import { sendNotification } from '@/lib/server/notify'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const emailGate = await requireVerifiedEmail()
  if (emailGate) return emailGate

  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`agreement_sign:${user.id}`, 20, 60)
  if (!allowed.allowed) return rateLimitError()

  const { id } = await params
  const supabase = await createClient()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*, orders(title, buyer_id, agencies(owner_id))')
    .eq('id', id)
    .maybeSingle()
  if (!agreement) return jsonError('Agreement not found', 404)

  const order = Array.isArray(agreement.orders) ? agreement.orders[0] : agreement.orders
  if (!order) return jsonError('Agreement has no order', 404)
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies

  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === agency?.owner_id
  if (!isBuyer && !isSeller) return jsonError('Not authorized for this agreement', 403)

  const now = new Date().toISOString()

  if (isBuyer) {
    const { error } = await supabase.from('agreements').update({ signed_by_buyer_at: now }).eq('id', id)
    if (error) return jsonError('Unable to sign agreement', 400)
  } else {
    const { error } = await supabase.from('agreements').update({ signed_by_seller_at: now }).eq('id', id)
    if (error) return jsonError('Unable to sign agreement', 400)
  }

  // Mark active once both sides have signed.
  const { data: updated } = await supabase.from('agreements').select('signed_by_buyer_at, signed_by_seller_at').eq('id', id).maybeSingle()
  if (updated && updated.signed_by_buyer_at && updated.signed_by_seller_at) {
    await supabase.from('agreements').update({ status: 'active', updated_at: now }).eq('id', id)
  }

  // Notify the other party that this side signed.
  const otherId = isBuyer ? agency?.owner_id : order.buyer_id
  if (otherId) {
    void sendNotification({
      userId: otherId,
      title: 'Agreement signed',
      body: `${user.user_metadata?.full_name ?? 'Your partner'} signed the agreement for "${order.title ?? 'your order'}".`,
      event: 'order',
    })
  }

  return NextResponse.json({ ok: true, status: updated?.signed_by_buyer_at && updated?.signed_by_seller_at ? 'active' : 'pending_signatures' })
}