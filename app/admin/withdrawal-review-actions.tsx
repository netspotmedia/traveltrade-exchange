"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function WithdrawalReviewActions({ withdrawalId }: { withdrawalId: string }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function decide(decision: 'paid' | 'rejected') {
    setBusy(decision)
    setMessage('Processing…')
    try {
      const r = await fetch('/api/withdrawals/process', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ withdrawalId, decision, note }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Processed.' : (j.error || 'Action failed'))
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
        placeholder="Note / failure reason (optional)"
        rows={2}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <Button size="sm" disabled={busy !== null} onClick={() => decide('paid')}>
          Mark paid
        </Button>
        <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => decide('rejected')}>
          Reject (refund)
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
