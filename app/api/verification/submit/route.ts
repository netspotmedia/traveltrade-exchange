import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { mfaGate } from '@/lib/server/mfa'
import { logAudit } from '@/lib/server/audit'

const BUCKET = 'verification-documents'
const TYPES = ['kyb', 'nanta', 'iata'] as const
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`verification_submit:${user.id}`, 10, 300)
  if (!allowed.allowed) return rateLimitError()

  // Confirm the user owns a verified-eligible agency (must exist; pending is ok).
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!agency) return NextResponse.json({ error: 'No agency profile found' }, { status: 403 })

  const form = await request.formData()
  const type = (form.get('type') as string | null) ?? ''
  const file = form.get('file') as File | null
  if (!TYPES.includes(type as (typeof TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 })
  }
  if (!file || !file.size) return NextResponse.json({ error: 'A document is required' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Document must be 10 MB or smaller' }, { status: 400 })

  // Reject if a pending submission of this type already exists.
  const { data: existing } = await supabase
    .from('verification_submissions')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('type', type)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) return NextResponse.json({ error: `You already have a pending ${type.toUpperCase()} submission` }, { status: 400 })

  // Collect optional submitted data from the form (strings only).
  const submittedData: Record<string, string> = {}
  for (const key of ['companyName', 'registrationNumber', 'nantaMembershipNumber', 'iataNumber', 'notes']) {
    const value = (form.get(key) as string | null)?.trim()
    if (value) submittedData[key] = value.slice(0, 500)
  }

  // Upload to storage (private bucket, path owned by agency).
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase()
  const objectPath = `${agency.id}/verification/${crypto.randomUUID()}_${Date.now()}.${extension}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, arrayBuffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: 'Unable to upload document. Please try again.' }, { status: 500 })

  // Create the submission row.
  const { data: submission, error: subError } = await supabase
    .from('verification_submissions')
    .insert({ agency_id: agency.id, type, submitted_data: submittedData })
    .select('id')
    .single()
  if (subError) {
    void supabase.storage.from(BUCKET).remove([objectPath])
    return NextResponse.json({ error: 'Unable to create submission' }, { status: 500 })
  }

  // Record the document.
  const { error: docError } = await supabase.from('verification_documents').insert({
    submission_id: submission.id,
    doc_type: type,
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

  void logAudit('verification_submitted', 'verification_submission', submission.id, { type })

  return NextResponse.json({ submissionId: submission.id, status: 'pending' }, { status: 201 })
}