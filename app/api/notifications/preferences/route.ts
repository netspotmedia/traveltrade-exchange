import { NextResponse } from 'next/server'
import { requireUser, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function GET() {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('event, email')
    .eq('user_id', user.id)
  if (error) return jsonError('Unable to load preferences', 500)
  return NextResponse.json({ preferences: data ?? [] })
}

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)

  const allowed = await rateLimit(`notif_prefs:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const items = Array.isArray(body.preferences) ? body.preferences : []
  if (items.length === 0) return jsonError('No preferences provided')

  const validEvents = ['agency_verification', 'service_review', 'withdrawal', 'dispute', 'general']
  const rows = items
    .filter((p: { event?: string; email?: boolean }) => p && typeof p.event === 'string' && validEvents.includes(p.event))
    .map((p: { event: string; email: boolean }) => ({ user_id: user.id, event: p.event, email: Boolean(p.email) }))

  if (rows.length === 0) return jsonError('No valid preferences')

  const { error } = await supabase.from('notification_preferences').upsert(rows, { onConflict: 'user_id,event' })
  if (error) return jsonError('Unable to save preferences', 400)
  return NextResponse.json({ ok: true })
}
