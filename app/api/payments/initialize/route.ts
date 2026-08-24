import { NextResponse } from 'next/server'
import { requireUser, validAmount, jsonError } from '@/lib/server/workflows'
import { initializePaystack } from '@/lib/paystack'

export async function POST(request: Request) {
  const { user } = await requireUser()
  if (!user) return jsonError('Authentication required', 401)
  const body = await request.json().catch(() => ({}))
  const amount = validAmount(body.amount)
  if (!amount) return jsonError('Enter a valid amount')
  const reference = typeof body.reference === 'string' && body.reference.length > 8 ? body.reference.slice(0, 80) : `ttx_${user.id}_${crypto.randomUUID()}`
  try {
    const result = await initializePaystack({ email: user.email ?? '', amountNaira: amount, reference, callbackUrl: `${new URL(request.url).origin}/api/payments/callback` })
    if (!result.configured) return NextResponse.json({ error: 'Paystack is not configured', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, { status: 503 })
    return NextResponse.json(result)
  } catch { return jsonError('Unable to initialize payment', 502) }
}
