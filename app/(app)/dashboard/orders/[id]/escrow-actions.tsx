"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type MilestoneRow = { id: string; title: string; amount: number; status: string }

export function EscrowActions({
  orderId,
  orderStatus,
  milestones,
  isBuyer,
  isSeller,
}: {
  orderId: string
  orderStatus: string
  milestones: MilestoneRow[]
  isBuyer: boolean
  isSeller: boolean
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
  const canFund = isBuyer && orderStatus === 'proposed'
  const cardTotal = milestones.reduce((sum, m) => sum + Number(m.amount), 0)

  return (
    <div className="mt-8 flex flex-col gap-5">
      {canFund && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy !== null} onClick={() => act('fund')}>
            Fund escrow from wallet
          </Button>
          <Button disabled={busy !== null} variant="outline" onClick={() => payByCard()}>
            Pay by card (₦{cardTotal.toLocaleString()})
          </Button>
        </div>
      )}

      {milestones.map((m) => {
        const isReleased = m.status === 'released'
        const canSubmit = isSeller && (m.status === 'pending' || m.status === 'funded' || m.status === 'submitted')
        const canApprove = isBuyer && m.status === 'submitted'
        const canRelease = isBuyer && m.status === 'approved'
        if (isReleased) return null
        return (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{m.title}</p>
              <p className="text-sm text-muted-foreground">₦{Number(m.amount).toLocaleString()} · {m.status}</p>
            </div>
            {canSubmit && (
              <Button size="sm" disabled={busy !== null} onClick={() => act('submitMilestone', { milestoneId: m.id })}>
                {m.status === 'submitted' ? 'Re-submit' : 'Submit delivery'}
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

      {!terminal && isBuyer && (
        <Button variant="outline" disabled={busy !== null} onClick={() => act('dispute')}>
          Open dispute
        </Button>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
