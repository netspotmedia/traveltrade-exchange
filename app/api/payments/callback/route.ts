import { NextResponse } from 'next/server'
import { verifyPaystack } from '@/lib/paystack'

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference')
  if (!reference) return NextResponse.redirect(new URL('/dashboard/wallet?payment=missing', request.url))
  try {
    const result = await verifyPaystack(reference)
    if (!result.configured) return NextResponse.redirect(new URL('/dashboard/wallet?payment=unavailable', request.url))
    const success = result.data.status === 'success'
    return NextResponse.redirect(new URL(`/dashboard/wallet?payment=${success ? 'verified' : 'failed'}&reference=${encodeURIComponent(reference)}`, request.url))
  } catch { return NextResponse.redirect(new URL('/dashboard/wallet?payment=failed', request.url)) }
}
