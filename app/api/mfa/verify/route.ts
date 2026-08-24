import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`mfa_verify:${user.id}`, 10, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const factorId = typeof body.factorId === 'string' ? body.factorId : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  if (!factorId || !code) return NextResponse.json({ error: 'Factor id and code are required' }, { status: 400 })

  // Challenge the factor, then verify with the code.
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return NextResponse.json({ error: challengeError.message }, { status: 400 })

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
