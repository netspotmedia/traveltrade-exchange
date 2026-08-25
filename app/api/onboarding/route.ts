import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { logAudit } from '@/lib/server/audit'

const BUCKET = 'verification-documents'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Onboarding is the beginning of ONE verification journey. It creates the
// agency (if needed), uploads the KYB document, and records the submission in
// BOTH the current system (verification_submissions) and the legacy
// kyc_documents table â€” preserving existing data and the existing admin
// review workflow. It never lets a seller submit the same KYB twice.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`onboarding:${user.id}`, 5, 300)
  if (!allowed.allowed) return rateLimitError()

  const form = await request.formData()
  const name = (form.get('name') as string | null)?.trim().slice(0, 200) ?? ''
  const file = form.get('file') as File | null

  if (!name || !file || !file.size) {
    return NextResponse.json({ error: 'Business name and a registration document are required' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Document must be 10 MB or smaller' }, { status: 400 })

  // 1. Create or reuse the agency for this owner.
  const { data: existing } = await supabase
    .from('agencies')
    .select('id, verification_status')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
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

  // 2. Never ask the seller to submit the same KYB twice.
  const [pendingSubmission, pendingLegacy] = await Promise.all([
    supabase
      .from('verification_submissions')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('type', 'kyb')
      .eq('status', 'pending')
      .maybeSingle(),
    supabase.from('kyc_documents').select('id').eq('agency_id', agencyId).eq('status', 'pending').maybeSingle(),
  ])
  if (pendingSubmission.data || pendingLegacy.data) {
    return NextResponse.json({ error: 'You already have a verification submission in review.', status: 'already_submitted' }, { status: 409 })
  }

  // 3. Upload the document to Supabase Storage (path owned by the agency).
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase()
  const objectPath = `${agencyId}/verification/${crypto.randomUUID()}_${Date.now()}.${extension}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, arrayBuffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) {
    return NextResponse.json({ error: 'Unable to upload document. Please try again.' }, { status: 500 })
  }

  // 4. Record the submission in the current verification system (canonical).
  const { data: submission, error: subError } = await supabase
    .from('verification_submissions')
    .insert({ agency_id: agencyId, type: 'kyb', submitted_data: { companyName: name } })
    .select('id')
    .single()
  if (subError) {
    void supabase.storage.from(BUCKET).remove([objectPath])
    return NextResponse.json({ error: 'Unable to create verification submission' }, { status: 500 })
  }

  const { error: docError } = await supabase.from('verification_documents').insert({
    submission_id: submission.id,
    doc_type: 'kyb',
    storage_path: objectPath,
    original_name: file.name.slice(0, 300),
    mime_type: file.type || null,
    file_size: file.size,
  })
  if (docError) {
    void supabase.storage.from(BUCKET).remove([objectPath])
    void supabase.from('verification_submissions').delete().eq('id', submission.id)
    return NextResponse.json({ error: 'Unable to save document record' }, { status: 500 })
  }

  // 5. Preserve the legacy record so the existing admin review workflow and
  //    historical data remain intact (same storage path, no duplicate upload).
  await supabase.from('kyc_documents').insert({
    agency_id: agencyId,
    document_type: 'business_registration',
    storage_path: objectPath,
    status: 'pending',
  })

  void logAudit('verification_submitted', 'verification_submission', submission.id, { type: 'kyb', source: 'onboarding' })

  return NextResponse.json({ agencyId, submissionId: submission.id, status: 'pending' }, { status: 201 })
}
