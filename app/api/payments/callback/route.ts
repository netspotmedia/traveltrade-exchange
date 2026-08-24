import { NextResponse } from 'next/server'
import { verifyPaystack } from '@/lib/paystack'
import { creditWalletFromTopup, completeCustomerEscrow } from '@/lib/server/money'

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference')
  if (!reference) return NextResponse.redirect(new URL('/dashboard/wallet?payment=missing', request.url))
  try {
    const result = await verifyPaystack(reference)
    if (!result.configured) return NextResponse.redirect(new URL('/dashboard/wallet?payment=unavailable', request.url))
    const success = result.data.status === 'success'

    if (success) {
      const amountNaira = Number(result.data.amount ?? 0) / 100
      const currency = result.data.currency ?? 'NGN'
      if (reference.startsWith('ttx_topup_')) {
        const userId = result.data.metadata?.user_id
        if (userId) {
          await creditWalletFromTopup({ userId, amount: amountNaira, currency, providerReference: reference })
        }
      } else {
        await completeCustomerEscrow({ reference, amount: amountNaira, currency })
      }
    }

    return NextResponse.redirect(
      new URL(`/dashboard/wallet?payment=${success ? 'verified' : 'failed'}&reference=${encodeURIComponent(reference)}`, request.url),
    )
  } catch {
    return NextResponse.redirect(new URL('/dashboard/wallet?payment=failed', request.url))
  }
}
