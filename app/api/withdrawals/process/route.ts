import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { processWithdrawal } from '@/lib/server/money'
import { sendNotification } from '@/lib/server/notify'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const allowed = await rateLimit(`admin_withdrawal:${user.id}`, 30, 60)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const withdrawalId = typeof body.withdrawalId === 'string' ? body.withdrawalId : ''
  const decision = body.decision
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null

  if (!withdrawalId || !['paid', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Withdrawal id and a valid decision are required' }, { status: 400 })
  }

  const result = await processWithdrawal({ withdrawalId, decision, actorId: user.id, note })
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Unable to process withdrawal' }, { status: 400 })

  // Notify the seller.
  const { data: withdrawal } = await supabase.from('withdrawals').select('seller_id, amount, currency').eq('id', withdrawalId).maybeSingle()
  if (withdrawal) {
    void sendNotification({
      userId: withdrawal.seller_id,
      title: decision === 'paid' ? 'Withdrawal paid out' : 'Withdrawal not approved',
      body: decision === 'paid' ? `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} ${withdrawal.currency} has been paid.` : `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} ${withdrawal.currency} was rejected and refunded.${note ? ` Reason: ${note}` : ''}`,
      event: 'withdrawal',
    })
  }

  return NextResponse.json({ ok: true, status: result.status })
}
