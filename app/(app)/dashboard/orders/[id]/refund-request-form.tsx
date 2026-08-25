'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function RefundRequestForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, reason }),
      })
      const j = await r.json()
      if (r.ok) {
        setMessage({ kind: 'ok', text: 'Refund request submitted. Our team will review it shortly.' })
        router.refresh()
      } else {
        setMessage({ kind: 'err', text: j.error || 'Unable to submit refund request' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-lg font-semibold">Request a refund</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your payment is still held in escrow. If the work hasn&apos;t been delivered, you can request a refund — our team will
        review it.
      </p>
      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
        Reason (optional)
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Tell us why you need a refund." className="resize-none" />
      </label>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={busy} onClick={submit}>
          {busy ? 'Submitting…' : 'Request refund'}
        </Button>
        {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
      </div>
    </div>
  )
}