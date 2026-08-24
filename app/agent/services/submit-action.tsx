"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SubmitServiceAction({ serviceId }: { serviceId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function submit() {
    setBusy(true)
    setMessage('Submitting…')
    try {
      const r = await fetch('/api/services/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Submitted for approval.' : (j.error || 'Action failed'))
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
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
