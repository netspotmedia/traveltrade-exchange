'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ProposeForm({ orderId }: { orderId: string }) {
  const [fee, setFee] = useState('')
  const [timeline, setTimeline] = useState('')
  const [note, setNote] = useState('')
  const [milestones, setMilestones] = useState([{ title: '', amount: '' }])
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const parsed = milestones.map((m) => ({ title: m.title.trim(), amount: Number(m.amount) }))
      const r = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, feeAmount: Number(fee), timelineDays: Number(timeline), note, milestones: parsed, parentProposalId: null }),
      })
      const j = await r.json()
      if (r.ok) {
        setMessage({ kind: 'ok', text: 'Proposal submitted. The customer will review it.' })
        router.push('/agent/proposals')
      } else {
        setMessage({ kind: 'err', text: j.error || 'Unable to submit proposal' })
      }
    } finally {
      setBusy(false)
    }
  }

  function updateMilestone(i: number, key: 'title' | 'amount', value: string) {
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Fee (NGN)
          <Input required type="number" min="1" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500000" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Timeline (days)
          <Input type="number" min="1" inputMode="numeric" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="14" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Note
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Scope, inclusions, anything the customer should know." />
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Milestone breakdown <span className="text-muted-foreground">(must add up to the fee)</span>
        </p>
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={m.title} onChange={(e) => updateMilestone(i, 'title', e.target.value)} placeholder="Milestone title" />
            <Input
              value={m.amount}
              onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
              placeholder="Amount"
              type="number"
              inputMode="numeric"
              className="w-32"
            />
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={() => setMilestones((p) => p.filter((_, idx) => idx !== i))}
                aria-label={`Remove milestone ${i + 1}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setMilestones((p) => [...p, { title: '', amount: '' }])} className="w-fit">
          <Plus className="size-4" /> Add milestone
        </Button>
      </div>

      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}

      <Button type="submit" disabled={busy} size="lg">
        {busy ? 'Submitting…' : 'Submit proposal'}
      </Button>
    </form>
  )
}