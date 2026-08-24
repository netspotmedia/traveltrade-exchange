import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'

const ENTITY_TYPES = ['agency', 'service', 'withdrawal', 'dispute'] as const
const DECISIONS = ['approved', 'rejected', 'resolved', 'paid'] as const

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_review:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const entityType = body.entityType
  const decision = body.decision
  const entityId = typeof body.entityId === 'string' ? body.entityId : ''

  if (
    !ENTITY_TYPES.includes(entityType) ||
    !DECISIONS.includes(decision) ||
    !entityId
  ) {
    return NextResponse.json({ error: 'Invalid review' }, { status: 400 })
  }

  const { error } = await supabase.from('admin_reviews').insert({
    entity_type: entityType,
    entity_id: entityId,
    reviewer_id: user.id,
    decision,
    note: typeof body.note === 'string' ? body.note.slice(0, 2000) : null,
  })
  if (error) return NextResponse.json({ error: 'Unable to record review' }, { status: 400 })
  return NextResponse.json({ ok: true })
}