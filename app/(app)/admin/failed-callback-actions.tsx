"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function FailedCallbackActions({ callbackId }: { callbackId: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function decide(status: 'resolved' | 'ignored') {
    setBusy(status)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/payments/resolve-callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callbackId, status }),
      })
      const j = await r.json()
      setMessage(r.ok ? { kind: 'ok', text: 'Updated.' } : { kind: 'err', text: j.error || 'Action failed' })
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy !== null} onClick={() => decide('resolved')}>Mark resolved</Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide('ignored')}>Ignore</Button>
      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
    </div>
  )
}
