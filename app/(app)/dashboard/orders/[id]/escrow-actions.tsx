"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { statusInfo } from '@/lib/status'

type MilestoneRow = { id: string; title: string; amount: number; status: string }

export type SignatureState =
  | { signed: boolean; hint: string | null }
  | null

export function EscrowActions({
  orderId,
  orderStatus,
  milestones,
  isBuyer,
  isSeller,
  signatureState,
}: {
  orderId: string
  orderStatus: string
  milestones: MilestoneRow[]
  isBuyer: boolean
  isSeller: boolean
  /** Agreement signature state; null when no agreement exists (legacy flow). */
  signatureState?: SignatureState
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  async function act(action: string, extra: Record<string, string> = {}) {
    setBusy(action)
    setMessage('Working…')
    try {
      const r = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, action, ...extra }),
      })
      const j = await r.json()
      setMessage(r.ok ? (j.result ? `Done. ${j.result.gross ? `Net ₦${Number(j.result.net).toLocaleString()} released.` : ''}` : 'Done.') : (j.error || 'Action failed'))
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function payByCard() {
    setBusy('card')
    setMessage('Opening secure payment…')
    const r = await fetch('/api/payments/escrow/initialize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId, amount: cardTotal }),
    })
    const j = await r.json()
    if (!r.ok) return setMessage(j.error || 'Unable to start payment')
    window.location.href = j.authorizationUrl
  }

  const terminal = ['completed', 'cancelled', 'disputed'].includes(orderStatus)
  // If an agreement exists but both parties haven't signed, funding is not
  // available yet — we explain why instead of letting the button fail.
  const agreementLocked = Boolean(signatureState && !signatureState.signed)
  const canFund = isBuyer && orderStatus === 'proposed' && !agreementLocked
  const cardTotal = milestones.reduce((sum, m) => sum + Number(m.amount), 0)

  return (
    <div className="mt-8 flex flex-col gap-5">
      {isBuyer && orderStatus === 'proposed' && (
        <div className="flex flex-col gap-3">
          {agreementLocked ? (
            <div className="flex items-start gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{signatureState?.hint ?? 'Payment becomes available after both parties sign the agreement.'}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy !== null} onClick={() => act('fund')}>
                Secure payment
              </Button>
              <Button disabled={busy !== null} variant="outline" onClick={() => payByCard()}>
                Pay by card (₦{cardTotal.toLocaleString()})
              </Button>
            </div>
          )}
        </div>
      )}

      {milestones.map((m) => {
        const isReleased = m.status === 'released'
        const canSubmit = isSeller && m.status === 'pending'
        const canApprove = isBuyer && m.status === 'submitted'
        const canRelease = isBuyer && m.status === 'approved'
        if (isReleased) return null
        return (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{m.title}</p>
              <p className="text-sm text-muted-foreground">₦{Number(m.amount).toLocaleString()} · {statusInfo('milestone', m.status).label}</p>
            </div>
            {canSubmit && (
              <Button size="sm" disabled={busy !== null} onClick={() => act('submitMilestone', { milestoneId: m.id })}>
                Submit delivery
              </Button>
            )}
            {canApprove && (
              <Button size="sm" disabled={busy !== null} onClick={() => act('approveMilestone', { milestoneId: m.id })}>
                Approve delivery
              </Button>
            )}
            {canRelease && (
              <Button size="sm" disabled={busy !== null} onClick={() => act('releaseMilestone', { milestoneId: m.id })}>
                Release funds
              </Button>
            )}
          </div>
        )
      })}

      {!terminal && (isBuyer || isSeller) && (
        <Button variant="outline" disabled={busy !== null} onClick={() => act('dispute')}>
          Open dispute
        </Button>
      )}

      {orderStatus === 'proposed' && (isBuyer || isSeller) && (
        <Button variant="ghost" disabled={busy !== null} onClick={() => act('cancel')}>
          Cancel order
        </Button>
      )}

      {message && <Alert variant={message.startsWith('Done') || message.startsWith('Net') ? 'success' : 'error'}>{message}</Alert>}
    </div>
  )
}
