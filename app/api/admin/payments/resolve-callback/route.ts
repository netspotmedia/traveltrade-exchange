import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { resolveFailedCallback } from '@/lib/server/money'
import { mfaGate } from '@/lib/server/mfa'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_callback:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const callbackId = typeof body.callbackId === 'string' ? body.callbackId : ''
  const status = body.status

  if (!callbackId || !['resolved', 'ignored'].includes(status)) {
    return NextResponse.json({ error: 'Callback id and a valid status are required' }, { status: 400 })
  }

  const result = await resolveFailedCallback({ callbackId, status, actorId: user.id })
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Unable to update' }, { status: 400 })
  return NextResponse.json({ ok: true, status: result.status })
}
