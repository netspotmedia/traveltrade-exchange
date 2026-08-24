import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializePaystack } from '@/lib/paystack'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { data, error } = await supabase.from('wallets').select('*, wallet_ledger(*)').eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load wallet' }, { status: 500 })
  return NextResponse.json({ wallet: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`topup:${user.id}`, 10, 300)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return NextResponse.json({ error: 'Enter a valid top-up amount' }, { status: 400 })
  }

  const { data: walletId, error } = await supabase.rpc('ensure_wallet', { p_user_id: user.id })
  if (error) return NextResponse.json({ error: 'Unable to initialize wallet' }, { status: 500 })

  const reference = `ttx_topup_${user.id}_${crypto.randomUUID()}`
  const origin = new URL(request.url).origin
  try {
    const result = await initializePaystack({
      email: user.email ?? '',
      amountNaira: amount,
      reference,
      callbackUrl: `${origin}/api/payments/callback`,
      metadata: { type: 'wallet_topup', user_id: user.id },
    })
    if (!result.configured) {
      return NextResponse.json({ error: 'Paystack is not configured', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, { status: 503 })
    }
    return NextResponse.json({ status: 'payment_required', walletId, amount, provider: 'paystack', authorizationUrl: result.authorizationUrl, reference })
  } catch {
    return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 502 })
  }
}
