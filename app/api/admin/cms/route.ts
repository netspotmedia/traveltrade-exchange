import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'

const ALLOWED_SLUGS = ['landing', 'how-it-works', 'about', 'contact', 'help', 'privacy', 'terms']

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`admin_cms:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const slug = typeof body.slug === 'string' ? body.slug : ''
  if (!ALLOWED_SLUGS.includes(slug)) return NextResponse.json({ error: 'Invalid page' }, { status: 400 })

  const hero = (body.hero && typeof body.hero === 'object' ? body.hero : {}) as Record<string, unknown>
  const cleanHero: Record<string, string> = {}
  for (const [k, v] of Object.entries(hero)) {
    if (typeof v === 'string') cleanHero[k] = v.slice(0, 5000)
  }

  const isPublished = body.isPublished === true
  const title = typeof cleanHero.title === 'string' && cleanHero.title.trim() ? cleanHero.title : 'TravelTrade Exchange'

  const existing = await supabase.from('cms_pages').select('id').eq('slug', slug).maybeSingle()

  if (existing.data) {
    const { error } = await supabase
      .from('cms_pages')
      .update({ title, sections: { hero: cleanHero }, is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await supabase.from('cms_pages').insert({
      slug,
      title,
      sections: { hero: cleanHero },
      is_published: isPublished,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}