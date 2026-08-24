import { NextResponse } from 'next/server'
import { verifyPaystackSignature } from '@/lib/paystack'

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyPaystackSignature(rawBody, request.headers.get('x-paystack-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string; status?: string } }
  if (event.event === 'charge.success' && event.data?.reference && event.data.status === 'success') {
    // Settlement is intentionally handled by a server-side transaction/RPC once the ledger RPC is deployed.
    return NextResponse.json({ received: true, reference: event.data.reference })
  }
  return NextResponse.json({ received: true })
}
