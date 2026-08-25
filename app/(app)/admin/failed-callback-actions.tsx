"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function FailedCallbackActions({ callbackId }: { callbackId: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function decide(status: 'resolved' | 'ignored') {
    setBusy(status)
    setMessage('Updating…')
    try {
      const r = await fetch('/api/admin/payments/resolve-callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callbackId, status }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Updated.' : (j.error || 'Action failed'))
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy !== null} onClick={() => decide('resolved')}>Mark resolved</Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide('ignored')}>Ignore</Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
