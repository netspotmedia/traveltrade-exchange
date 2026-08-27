"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ServiceMeta = { title: string; basePrice: number; currency: string }

export default function OrderForm({
  serviceId,
  agencyId,
  serviceMeta,
}: {
  serviceId: string | null
  agencyId: string | null
  serviceMeta?: ServiceMeta | null
}) {
  const router = useRouter()
  // A stable idempotency key for this form instance. Generating a fresh one
  // per submit would let a double-click create duplicate orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState(serviceMeta?.title ?? '')
  const [amount, setAmount] = useState(serviceMeta ? String(serviceMeta.basePrice) : '')
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
        body: JSON.stringify({ title, totalAmount: amount, serviceId, agencyId, idempotencyKey }),
      })
      const result = await response.json()
      if (!response.ok) return setMessage(result.error || 'Unable to create order')
      router.push(`/dashboard/orders/${result.order.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 glass-panel rounded-2xl p-6 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">New order</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tell the agent what you need</h1>
        <p className="mt-2 text-muted-foreground">Your payment will be protected until you approve the delivered work.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Order title
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Airport transfer for Lagos team"
          disabled={Boolean(serviceMeta)}
        />
      </label>

      {serviceMeta ? (
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span>Order amount ({serviceMeta.currency})</span>
          <Input value={amount} disabled className="font-mono" />
          <p className="text-xs text-muted-foreground">This is the price of the service. It&apos;s locked for instant ordering.</p>
        </div>
      ) : (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Order amount (NGN)
          <Input required min="1" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45000" />
        </label>
      )}

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