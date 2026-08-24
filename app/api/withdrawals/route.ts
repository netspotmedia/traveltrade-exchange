import { NextResponse } from 'next/server'
import { requireVerifiedAgent, cleanText, jsonError } from '@/lib/server/workflows'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'
import { requestWithdrawal } from '@/lib/server/money'
import { mfaGate } from '@/lib/server/mfa'

export async function POST(request: Request) {
  const mfa = await mfaGate()
  if (mfa) return mfa
  const { user, response } = await requireVerifiedAgent()
  if (response) return response

  const allowed = await rateLimit(`withdrawal:${user!.id}`, 5, 300)
  if (!allowed.allowed) return rateLimitError()

  const body = await request.json().catch(() => ({}))
  const amount = Number(body.amount)
  const bankName = cleanText(body.bankName, 200)
  const accountName = cleanText(body.accountName, 200)
  const accountNumber = cleanText(body.accountNumber, 50)

  if (!Number.isFinite(amount) || amount <= 0) return jsonError('Enter a valid amount')
  if (!bankName || !accountName || !accountNumber) {
    return jsonError('Bank name, account name and account number are required')
  }

  const result = await requestWithdrawal({
    userId: user!.id,
    amount,
    bankName,
    accountName,
    accountNumber,
  })
  if (!result.ok) return jsonError(result.error ?? 'Unable to request withdrawal', 400)
  return NextResponse.json({ ...result })
}
