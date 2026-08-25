import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { dispatchEmail } from '@/lib/server/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LEN = 5000

function clean(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Server-side contact form. Validates input, rate-limits per IP/email, and
// dispatches via the existing email infrastructure. Never exposes SMTP or
// provider credentials.
export async function POST(request: Request) {
  const allowed = await rateLimit('contact_form', 5, 300)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const name = clean(body.name, 200)
  const email = clean(body.email, 320)
  const message = clean(body.message, MAX_LEN)

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'Please write a message of at least 10 characters.' }, { status: 400 })
  }

  // Dispatch to the support inbox via the existing email layer. Fire-and-forget
  // would risk silently losing a message, so we await the result.
  const supportEmail = process.env.CONTACT_TO_EMAIL ?? 'support@traveltradeexchange.com'
  const result = await dispatchEmail({
    to: supportEmail,
    subject: `Contact form: ${name}`,
    body: `From: ${name} <${email}>\n\n${message}`,
    dedupeKey: `contact:${email}:${message.slice(0, 40)}`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Unable to send your message. Please try again shortly.' }, { status: 500 })
  }

  // Best-effort: keep an audit-safe record of the submission.
  const supabase = await createClient()
  try {
    await supabase.from('audit_logs').insert({
      action: 'contact_submitted',
      metadata: { email, name, messageLen: message.length },
    })
  } catch {
    // Audit logging must never break the contact submission.
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}