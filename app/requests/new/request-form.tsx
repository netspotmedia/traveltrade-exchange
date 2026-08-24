"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function RequestForm({ serviceId }: { serviceId: string }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('Submitting quote request…')
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
    <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-5 rounded-3xl border bg-card p-8">
      <div>
        <p className="text-sm font-semibold text-primary">Request a quote</p>
        <h1 className="mt-2 text-3xl font-semibold">Tell the agency what you need</h1>
        <p className="mt-2 text-muted-foreground">The agency will respond with a proposal and milestone breakdown.</p>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium">
        What do you need? (brief)
        <textarea required value={title} onChange={(e) => setTitle(e.target.value)} rows={4} className="rounded-xl border bg-background px-4 py-3" placeholder="Describe your travel requirement, dates, and group size…" />
      </label>
      <Button type="submit" disabled={busy}>Request quote</Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  )
}
