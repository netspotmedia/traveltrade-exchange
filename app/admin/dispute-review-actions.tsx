"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DisputeReviewActions({ disputeId }: { disputeId: string }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function act(action: string) {
    setBusy(action)
    setMessage('Processing…')
    try {
      const r = await fetch('/api/admin/disputes/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disputeId, action, note }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Updated.' : (j.error || 'Action failed'))
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (optional)"
        rows={2}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act('escalate')}>
          Take under review
        </Button>
        <Button size="sm" disabled={busy !== null} onClick={() => act('resolved_buyer')}>
          Resolve for buyer (refund)
        </Button>
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => act('resolved_seller')}>
          Resolve for seller (release)
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
