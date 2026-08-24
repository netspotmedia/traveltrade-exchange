import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const body = await request.json()
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  const { data: walletId, error } = await supabase.rpc('ensure_wallet', { p_user_id: user.id })
  if (error) return NextResponse.json({ error: 'Unable to initialize wallet' }, { status: 500 })
  return NextResponse.json({ status: 'payment_required', walletId, amount, provider: 'paystack', configured: Boolean(process.env.PAYSTACK_SECRET_KEY) }, { status: 202 })
}
