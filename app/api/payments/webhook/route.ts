import { NextResponse } from 'next/server'
import { verifyPaystackSignature } from '@/lib/paystack'
import { creditWalletFromTopup, completeCustomerEscrow } from '@/lib/server/money'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`webhook:${ip}`, 60, 60)
  if (!allowed.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const rawBody = await request.text()
  if (!verifyPaystackSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    event?: string
    data?: {
      reference?: string
      status?: string
      amount?: number
      currency?: string
      metadata?: { type?: string; user_id?: string }
    }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: true })
  }

  if (event.event !== 'charge.success' || !event.data?.reference) {
    return NextResponse.json({ received: true })
  }

  const { reference, status, amount, currency, metadata } = event.data
  if (status !== 'success') return NextResponse.json({ received: true })

  const amountNaira = typeof amount === 'number' ? amount / 100 : 0
  const type = metadata?.type ?? 'wallet_topup'

  if (type === 'customer_escrow') {
    const result = await completeCustomerEscrow({
      reference,
      amount: amountNaira,
      currency,
    })
    if (!result.ok && !result.already_processed) {
      // Do not 5xx: Paystack will retry, but we must not double-credit.
      // A non-2xx tells Paystack to retry later; we return 200 to avoid loops
      // only when already processed or truly settled.
      return NextResponse.json({ received: true, error: result.error })
    }
    return NextResponse.json({ received: true, reference })
  }

  // Default: wallet top-up. The user id must come from the metadata we set at
  // initialize time. If absent, we cannot safely credit — return 200 so
  // Paystack stops retrying (avoids unbounded retries on uncredit-able events).
  const userId = metadata?.user_id
  if (!userId) {
    return NextResponse.json({ received: true, error: 'Missing user_id metadata' })
  }
  const result = await creditWalletFromTopup({
    userId,
    amount: amountNaira,
    currency,
    providerReference: reference,
  })
  if (!result.ok && !result.already_processed) {
    return NextResponse.json({ received: true, error: result.error })
  }
  return NextResponse.json({ received: true, reference })
}
