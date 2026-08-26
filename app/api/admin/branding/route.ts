import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'

const ALLOWED_KEYS = ['logo', 'favicon', 'og_image']

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`admin_branding:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key : ''
  const url = typeof body.url === 'string' ? body.url.trim().slice(0, 2000) : ''
  const alt = typeof body.alt === 'string' ? body.alt.trim().slice(0, 500) : ''

  if (!ALLOWED_KEYS.includes(key) || !url) {
    return NextResponse.json({ error: 'A valid asset key and URL are required' }, { status: 400 })
  }

  const existing = await supabase.from('site_assets').select('id').eq('key', key).maybeSingle()

  if (existing.data) {
    const { error } = await supabase.from('site_assets').update({ url, alt: alt || null, updated_at: new Date().toISOString() }).eq('key', key)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await supabase.from('site_assets').insert({ key, url, alt: alt || null })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}