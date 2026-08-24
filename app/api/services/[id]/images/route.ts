import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { publicImageUrl } from '@/lib/images'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

// Upload a service image to the public service-images bucket and link it.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, agency, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`service_images:${user!.id}`, 20, 300)
  if (!allowed.allowed) return rateLimitError()

  const { id } = await params
  const supabase = await createClient()

  const { data: service } = await supabase.from('services').select('id, agency_id, images').eq('id', id).maybeSingle()
  if (!service) return jsonError('Service not found', 404)
  if (service.agency_id !== agency!.id) return jsonError('Not authorized for this service', 403)

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file || !file.size) return jsonError('An image file is required')
  if (!ALLOWED_TYPES.includes(file.type)) return jsonError('Only JPG, PNG, WEBP or GIF images are supported')
  if (file.size > MAX_SIZE) return jsonError('Image must be 5MB or smaller')

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safeExt = ext === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${id}/${crypto.randomUUID()}.${safeExt}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('service-images')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadError) return jsonError('Unable to upload image', 500)

  const images = [...((service.images ?? []) as string[]), path]
  const { error: updateError } = await supabase.from('services').update({ images, updated_at: new Date().toISOString() }).eq('id', id)
  if (updateError) return jsonError('Image uploaded but could not be linked', 500)

  return NextResponse.json({ ok: true, imageUrl: publicImageUrl(path) }, { status: 201 })
}