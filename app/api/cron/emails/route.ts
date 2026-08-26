import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { retryEmail } from '@/lib/server/email'

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Pick up emails that are retrying and due, or failed (allow one final inline retry).
  const { data: emails, error } = await supabase
    .from('email_logs')
    .select('id')
    .in('status', ['retrying', 'failed'])
    .or(`next_retry_at.lte.${now},status.eq.failed`)
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let retried = 0
  for (const email of emails ?? []) {
    const result = await retryEmail(email.id)
    if (result.ok) retried += 1
  }

  return NextResponse.json({ ok: true, retried, total: emails?.length ?? 0 })
}