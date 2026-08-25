"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function DisputeReviewActions({ disputeId }: { disputeId: string }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function act(action: string) {
    setBusy(action)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/disputes/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disputeId, action, note }),
      })
      const j = await r.json()
      setMessage(r.ok ? { kind: 'ok', text: 'Updated.' } : { kind: 'err', text: j.error || 'Action failed' })
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (optional)"
        rows={2}
        className="min-h-16"
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
      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
    </div>
  )
}
