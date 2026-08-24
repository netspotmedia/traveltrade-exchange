import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, requireVerifiedEmail, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

type RouteCtx = { params: Promise<{ id: string }> }

async function assertParticipant(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string, userId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('buyer_id, agencies(owner_id)')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return false
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  return userId === order.buyer_id || userId === agency?.owner_id
}

export async function GET(request: Request, { params }: RouteCtx) {
  const { supabase, user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)
  const { id } = await params
  if (!(await assertParticipant(supabase, id, user.id))) return jsonError('Not authorized for this order', 403)

  const { data: messages, error } = await supabase
    .from('order_messages')
    .select('*, sender:profiles(email, full_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
  if (error) return jsonError('Unable to load messages', 500)

  // Mark the other participant's messages as read.
  const { data: order } = await supabase.from('orders').select('buyer_id, agencies(owner_id)').eq('id', id).maybeSingle()
  if (order) {
    const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
    const otherId = user.id === order.buyer_id ? agency?.owner_id : order.buyer_id
    if (otherId) {
      await supabase
        .from('order_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('order_id', id)
        .eq('sender_id', otherId)
        .is('read_at', null)
    }
  }

  return NextResponse.json({ messages })
}

export async function POST(request: Request, { params }: RouteCtx) {
  const emailGate = await requireVerifiedEmail()
  if (emailGate) return emailGate

  const { supabase, user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)
  const { id } = await params
  if (!(await assertParticipant(supabase, id, user.id))) return jsonError('Not authorized for this order', 403)

  const allowed = await rateLimit(`msg:${user.id}:${id}`, 20, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const message = cleanText(body.body, 5000)
  if (!message) return jsonError('Message cannot be empty')

  const { data, error } = await supabase
    .from('order_messages')
    .insert({ order_id: id, sender_id: user.id, body: message })
    .select('*, sender:profiles(email, full_name)')
    .single()
  if (error) return jsonError('Unable to send message', 400)
  return NextResponse.json({ message: data }, { status: 201 })
}
