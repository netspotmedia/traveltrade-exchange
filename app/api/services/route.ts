import { NextResponse } from 'next/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string) {
  const root = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service'
  let slug = root
  let attempt = 0
  for (;;) {
    const { data } = await supabase.from('services').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    attempt += 1
    slug = `${root}-${attempt}`
  }
}

export async function POST(request: Request) {
  const { user, agency, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`service_create:${user!.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const title = cleanText(body.title, 200)
  const category = cleanText(body.category, 100)
  const description = cleanText(body.description, 5000)
  const location = cleanText(body.location, 200)
  const basePrice = Number(body.basePrice)

  if (!title || !category || !description || !Number.isFinite(basePrice) || basePrice < 0) {
    return jsonError('Title, category, description and a valid base price are required')
  }

  const slug = await uniqueSlug(supabase, title)
  const { data: service, error } = await supabase
    .from('services')
    .insert({
      agency_id: agency!.id,
      title,
      slug,
      category,
      description,
      location: location || null,
      base_price: Math.round(basePrice * 100) / 100,
      currency: 'NGN',
      status: 'draft',
    })
    .select('*')
    .single()

  if (error) return jsonError('Unable to create service', 400)
  return NextResponse.json({ service }, { status: 201 })
}
