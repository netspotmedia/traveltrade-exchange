import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type EmailProvider = 'resend' | 'smtp'

const BACKOFFS = [2000, 10000, 60000]
const MAX_ATTEMPTS = 3
const MAX_TOTAL_ATTEMPTS = 9
const DEDUPE_WINDOW_MS = 5 * 60 * 1000

export interface DispatchOptions {
  to: string
  subject: string
  body?: string
  dedupeKey?: string
  provider?: EmailProvider
}

export interface DispatchResult {
  ok: boolean
  status: string
  emailLogId?: string
  error?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendViaResend(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')
  const from = process.env.MAIL_FROM_ADDRESS ?? 'TravelTrade Exchange <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${text.slice(0, 300)}`)
  }
}

async function sendViaSmtp(to: string, subject: string, body: string): Promise<void> {
  // Lazy require so the module still loads without nodemailer installed.
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: (process.env.MAIL_ENCRYPTION ?? 'tls') === 'ssl',
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  })
  await transporter.sendMail({
    from: process.env.MAIL_FROM_ADDRESS ?? 'TravelTrade Exchange',
    to,
    subject,
    text: body,
  })
}

// Shared delivery loop for fresh dispatches and cron retries. Tracks the
// cumulative attempt count on the log row so re-runs keep escalating.
async function deliver(
  supabase: SupabaseClient,
  emailLogId: string,
  to: string,
  subject: string,
  body: string,
  provider: EmailProvider,
): Promise<DispatchResult> {
  const { data: log } = await supabase.from('email_logs').select('attempts').eq('id', emailLogId).maybeSingle()
  const start = log?.attempts ?? 0
  const providers: EmailProvider[] = provider === 'smtp' ? ['smtp', 'resend'] : ['resend', 'smtp']

  let lastError: string | null = null
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const attempt = start + i + 1
    if (attempt > MAX_TOTAL_ATTEMPTS) break
    for (const prov of providers) {
      await supabase.from('email_logs').update({ status: 'sending', provider: prov, updated_at: new Date().toISOString() }).eq('id', emailLogId)
      try {
        if (prov === 'resend') {
          await sendViaResend(to, subject, body)
        } else {
          await sendViaSmtp(to, subject, body)
        }
        await supabase.from('email_logs').update({ status: 'sent', attempts: attempt, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', emailLogId)
        return { ok: true, status: 'sent', emailLogId }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown email error'
        await supabase.from('email_logs').update({ status: 'retrying', attempts: attempt, error: lastError, next_retry_at: new Date(Date.now() + BACKOFFS[Math.min(attempt, BACKOFFS.length) - 1]).toISOString(), updated_at: new Date().toISOString() }).eq('id', emailLogId)
      }
    }
    if (i < MAX_ATTEMPTS - 1) await sleep(BACKOFFS[Math.min(i + 1, BACKOFFS.length) - 1])
  }

  await supabase.from('email_logs').update({ status: 'failed', error: lastError, updated_at: new Date().toISOString() }).eq('id', emailLogId)
  return { ok: false, status: 'failed', emailLogId, error: lastError ?? 'Email delivery failed' }
}

export async function dispatchEmail(input: DispatchOptions): Promise<DispatchResult> {
  const supabase = createServiceClient()

  const dedupeKey = input.dedupeKey ?? `email:${input.to}:${input.subject}`

  // Dedupe: within 5 minutes of a sent email with the same key, skip.
  const windowStart = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
  const { data: recent } = await supabase
    .from('email_logs')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .in('status', ['sent', 'sending', 'retrying'])
    .gte('created_at', windowStart)
    .maybeSingle()
  if (recent) {
    return { ok: true, status: 'skipped', emailLogId: recent.id }
  }

  // Persist the log row first (so a crash still leaves an audit trail).
  // The full recipient is stored so the cron worker can re-send; the admin
  // viewer masks it at display time.
  const { data: log, error: insertError } = await supabase
    .from('email_logs')
    .insert({ recipient: input.to, subject: input.subject, body: input.body ?? null, provider: input.provider ?? 'resend', status: 'queued', dedupe_key: dedupeKey })
    .select('id')
    .single()
  if (insertError) {
    // If the log can't be persisted, still attempt a best-effort send.
    return { ok: false, status: 'failed', error: 'Unable to persist email log' }
  }

  return deliver(supabase, log.id, input.to, input.subject, input.body ?? '', input.provider ?? 'resend')
}

// Explicit retry of a persisted email log row, used by the cron worker.
// Skips the dedupe window because this is an intentional re-send.
export async function retryEmail(emailLogId: string): Promise<DispatchResult> {
  const supabase = createServiceClient()
  const { data: log, error } = await supabase
    .from('email_logs')
    .select('recipient, subject, body, provider')
    .eq('id', emailLogId)
    .maybeSingle()
  if (error || !log) return { ok: false, status: 'failed', error: 'Email log not found' }
  return deliver(supabase, emailLogId, log.recipient, log.subject, log.body ?? '', log.provider)
}