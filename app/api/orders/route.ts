import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const agencyId = typeof body.agencyId === 'string' ? body.agencyId : ''
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : null
  const totalAmount = Number(body.totalAmount)
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : crypto.randomUUID()
  if (!title || !agencyId || !Number.isFinite(totalAmount) || totalAmount <= 0) return NextResponse.json({ error: 'Invalid order details' }, { status: 400 })
  const { data, error } = await supabase.from('orders').insert({ buyer_id: user.id, agency_id: agencyId, service_id: serviceId, title, total_amount: totalAmount, idempotency_key: idempotencyKey, status: 'proposed' }).select().single()
  if (error) return NextResponse.json({ error: 'Unable to create order' }, { status: 400 })
  return NextResponse.json({ order: data }, { status: 201 })
}
