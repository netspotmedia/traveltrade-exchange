"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function SubmitServiceAction({ serviceId }: { serviceId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/services/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      })
      const j = await r.json()
      setMessage(r.ok ? { kind: 'ok', text: 'Submitted for approval.' } : { kind: 'err', text: j.error || 'Action failed' })
      if (r.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="sm" disabled={busy} onClick={submit}>
        Submit for approval
      </Button>
      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
    </div>
  )
}
