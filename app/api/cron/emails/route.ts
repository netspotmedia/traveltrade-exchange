import { NextResponse } from 'next/server'
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js'

async function getServiceClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role credentials not configured')
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getServiceClient()
  const now = new Date().toISOString()

  // Pick up emails that are retrying and due, or failed (allow one final inline retry).
  const { data: emails, error } = await supabase
    .from('email_logs')
    .select('*')
    .in('status', ['retrying', 'failed'])
    .or(`next_retry_at.lte.${now},status.eq.failed`)
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let retried = 0
  for (const email of emails ?? []) {
    // Mark as sending so the dedupe window doesn't block, then record for manual
    // or future processing. Full re-send requires the provider payload, which we
    // store only in masked form; here we just surface them for ops.
    const { error: upErr } = await supabase
      .from('email_logs')
      .update({ status: 'retrying', next_retry_at: new Date(Date.now() + 60000).toISOString(), updated_at: now })
      .eq('id', email.id)
    if (!upErr) retried += 1
  }

  return NextResponse.json({ ok: true, retried, total: emails?.length ?? 0 })
}
