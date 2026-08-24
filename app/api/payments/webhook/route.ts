import { NextResponse } from 'next/server'
import { verifyPaystackSignature } from '@/lib/paystack'
import { creditWalletFromTopup, completeCustomerEscrow } from '@/lib/server/money'
import { rateLimit } from '@/lib/server/rate-limit'
import { createClient } from '@/lib/supabase/server'

async function recordFailure(reference: string, reason: string, payload: unknown, amountNaira?: number, currency?: string) {
  try {
    const supabase = await createClient()
    await supabase.rpc('record_failed_callback', {
      p_reference: reference,
      p_payload: payload,
      p_reason: reason,
      p_amount: amountNaira ?? null,
      p_currency: currency ?? null,
    })
  } catch {
    // Best-effort; the callback is preserved as best we can.
  }
}

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
    const result = await completeCustomerEscrow({ reference, amount: amountNaira, currency })
    if (!result.ok && !result.already_processed) {
      // Persist so the charge is never silently lost; admin can reconcile/retry.
      await recordFailure(reference, result.error ?? 'Settlement failed', event, amountNaira, currency)
      return NextResponse.json({ received: true, error: result.error })
    }
    return NextResponse.json({ received: true, reference })
  }

  // Default: wallet top-up.
  const userId = metadata?.user_id
  if (!userId) {
    await recordFailure(reference, 'Missing user_id metadata', event, amountNaira, currency)
    return NextResponse.json({ received: true, error: 'Missing user_id metadata' })
  }
  const result = await creditWalletFromTopup({ userId, amount: amountNaira, currency, providerReference: reference })
  if (!result.ok && !result.already_processed) {
    await recordFailure(reference, result.error ?? 'Settlement failed', event, amountNaira, currency)
    return NextResponse.json({ received: true, error: result.error })
  }
  return NextResponse.json({ received: true, reference })
}
