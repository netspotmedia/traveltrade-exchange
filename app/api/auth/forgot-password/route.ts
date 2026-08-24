import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`forgot_pw:${ip}`, 5, 900)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })

  const origin = new URL(request.url).origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })
  if (error) {
    // Do not reveal whether the account exists; return a generic message.
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: true })
}
