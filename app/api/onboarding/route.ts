import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

const BUCKET = 'verification-documents'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`onboarding:${user.id}`, 5, 300)
  if (!allowed.allowed) return rateLimitError()

  const form = await request.formData()
  const name = (form.get('name') as string | null)?.trim() ?? ''
  const documentType = (form.get('documentType') as string | null) ?? 'business_registration'
  const file = form.get('file') as File | null

  if (!name || !file || !file.size) {
    return NextResponse.json({ error: 'Business name and a registration document are required' }, { status: 400 })
  }

  // 1. Create or reuse the agency for this owner.
  const { data: existing } = await supabase
    .from('agencies')
    .select('id, verification_status')
    .eq('owner_id', user.id)
    .maybeSingle()

  let agencyId = existing?.id ?? null
  if (!agencyId) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id.slice(0, 8)}`
    const { data: created, error } = await supabase
      .from('agencies')
      .insert({ owner_id: user.id, name, slug, verification_status: 'pending' })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: 'Unable to create agency profile' }, { status: 400 })
    agencyId = created.id
  }

  // 2. Upload the document to Supabase Storage (path owned by the agency).
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase()
  const objectPath = `${agencyId}/${crypto.randomUUID()}_${Date.now()}.${extension}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, arrayBuffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ error: 'Unable to upload document. Please try again.' }, { status: 500 })
  }

  // 3. Record document metadata.
  const { error: docError } = await supabase.from('kyc_documents').insert({
    agency_id: agencyId,
    document_type: documentType,
    storage_path: objectPath,
    status: 'pending',
  })
  if (docError) {
    return NextResponse.json({ error: 'Agency created but document record failed' }, { status: 500 })
  }

  return NextResponse.json({ agencyId, status: 'pending' }, { status: 201 })
}
