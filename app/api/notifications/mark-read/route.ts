import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`notif_read:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []

  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  if (ids.length > 0) query = query.in('id', ids)
  const { error } = await query
  if (error) return jsonError('Unable to update notifications', 400)
  return NextResponse.json({ ok: true })
}
