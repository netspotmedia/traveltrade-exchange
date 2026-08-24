import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { uniqueSlug, sanitizeFaqs, sanitizeDetails } from '@/lib/services'

// Edit a service (title, category, description, location, price, structured content).
// Only draft / not-approved services can be edited; published edits require moderation.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, agency, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`service_edit:${user!.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const { id } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('id, agency_id, status, slug, title')
    .eq('id', id)
    .maybeSingle()
  if (!service) return jsonError('Service not found', 404)
  if (service.agency_id !== agency!.id) return jsonError('Not authorized for this service', 403)
  if (!['draft', 'rejected'].includes(service.status)) {
    return jsonError('Only draft or not-approved services can be edited', 400)
  }

  const body = await request.json().catch(() => ({}))
  const title = cleanText(body.title, 200)
  const category = cleanText(body.category, 100)
  const description = cleanText(body.description, 5000)
  const location = cleanText(body.location, 200)
  const basePrice = Number(body.basePrice)

  if (!title || !category || !description || !Number.isFinite(basePrice) || basePrice < 0) {
    return jsonError('Title, category, description and a valid base price are required')
  }

  const slug = title !== service.title ? await uniqueSlug(supabase, title) : service.slug
  const details = sanitizeDetails(body.details)
  const faqs = Array.isArray(body.faqs) ? sanitizeFaqs(body.faqs) : undefined

  const updateData: Record<string, unknown> = {
    title,
    slug,
    category,
    description,
    location: location || null,
    base_price: Math.round(basePrice * 100) / 100,
    updated_at: new Date().toISOString(),
  }
  if (details) updateData.details = details
  if (faqs !== undefined) updateData.faqs = faqs

  const { error } = await supabase.from('services').update(updateData).eq('id', id).eq('agency_id', agency!.id)
  if (error) return jsonError('Unable to update service', 400)
  return NextResponse.json({ ok: true })
}