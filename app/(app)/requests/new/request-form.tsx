"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function RequestForm({ serviceId }: { serviceId: string }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId, title }),
      })
      const j = await r.json()
      if (!r.ok) return setMessage(j.error || 'Unable to submit request')
      router.push(`/dashboard/orders/${j.order.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 glass-panel rounded-2xl p-6 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">Request a quote</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tell the agent what you need</h1>
        <p className="mt-2 text-muted-foreground">The agent will respond with a proposal and milestone breakdown — nothing is paid yet.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        What do you need?
        <Textarea
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={5}
          placeholder="Describe your travel requirement — dates, group size, destinations, and anything important."
        />
      </label>

      {message && (
        <Alert variant="error">{message}</Alert>
      )}

      <Button type="submit" disabled={busy} size="lg">
        {busy ? 'Submitting…' : 'Request a quote'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Free to request. You only pay when you agree on a plan.</p>
    </form>
  )
}