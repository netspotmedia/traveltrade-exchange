const PAYSTACK_URL = 'https://api.paystack.co'

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY)
}

export async function initializePaystack(input: {
  email: string
  amountNaira: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}) {
  if (!paystackConfigured()) return { configured: false as const }
  const response = await fetch(`${PAYSTACK_URL}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      reference: input.reference,
      callback_url: input.callbackUrl,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
    cache: 'no-store',
  })
  const payload = await response.json()
  if (!response.ok || !payload.status) throw new Error('Paystack initialization failed')
  return { configured: true as const, authorizationUrl: payload.data.authorization_url, reference: payload.data.reference }
}

export async function verifyPaystack(reference: string) {
  if (!paystackConfigured()) return { configured: false as const }
  const response = await fetch(`${PAYSTACK_URL}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok || !payload.status) throw new Error('Paystack verification failed')
  return { configured: true as const, data: payload.data }
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false
  const crypto = require('node:crypto') as typeof import('node:crypto')
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
