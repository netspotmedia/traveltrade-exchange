import { NextResponse } from 'next/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { uniqueSlug, sanitizeFaqs, sanitizeDetails } from '@/lib/services'

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
  const details = sanitizeDetails(body.details)
  const faqs = Array.isArray(body.faqs) ? sanitizeFaqs(body.faqs) : undefined

  const insertData: Record<string, unknown> = {
    agency_id: agency!.id,
    title,
    slug,
    category,
    description,
    location: location || null,
    base_price: Math.round(basePrice * 100) / 100,
    currency: 'NGN',
    status: 'draft',
  }
  if (details) insertData.details = details
  if (faqs !== undefined) insertData.faqs = faqs

  const { data: service, error } = await supabase.from('services').insert(insertData).select('*').single()

  if (error) return jsonError('Unable to create service', 400)
  return NextResponse.json({ service }, { status: 201 })
}
