"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function OrderForm({ serviceId, agencyId }: { serviceId: string | null; agencyId: string | null }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, totalAmount: amount, serviceId, agencyId, idempotencyKey: crypto.randomUUID() }),
      })
      const result = await response.json()
      if (!response.ok) return setMessage(result.error || 'Unable to create order')
      router.push(`/dashboard/orders/${result.order.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 surface-soft sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">New order</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tell the agent what you need</h1>
        <p className="mt-2 text-muted-foreground">Your payment will be protected until you approve the delivered work.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Order title
        <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Airport transfer for Lagos team" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Order amount (NGN)
        <Input required min="1" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45000" />
      </label>

      <div className="flex items-start gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Your payment is held securely and only released when you approve the work. You can message the agent at any time.</p>
      </div>

      {message && (
        <Alert variant="error">{message}</Alert>
      )}

      <Button type="submit" disabled={busy} size="lg">
        {busy ? 'Creating order…' : 'Create protected order'}
      </Button>
    </form>
  )
}