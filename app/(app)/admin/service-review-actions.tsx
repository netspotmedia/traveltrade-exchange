"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ServiceReviewActions({ serviceId }: { serviceId: string }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(decision)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/services/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId, decision, note }),
      })
      const j = await r.json()
      setMessage(r.ok ? { kind: 'ok', text: 'Review recorded.' } : { kind: 'err', text: j.error || 'Action failed' })
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
        placeholder="Reviewer note (optional)"
        rows={2}
        className="min-h-16"
      />
      <div className="flex flex-wrap gap-3">
        <Button size="sm" disabled={busy !== null} onClick={() => decide('approved')}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
    </div>
  )
}
