"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Proposal = {
  id: string
  fee_amount: number
  timeline_days: number | null
  note: string | null
  status: string
  created_at: string
}

export function ProposalPanel({ orderId, isBuyer, isSeller, proposals }: { orderId: string; isBuyer: boolean; isSeller: boolean; proposals: Proposal[] }) {
  const [fee, setFee] = useState('')
  const [timeline, setTimeline] = useState('')
  const [note, setNote] = useState('')
  const [milestones, setMilestones] = useState([{ title: '', amount: '' }])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  const latest = proposals[0] ?? null

  async function post(path: string, body: Record<string, unknown>) {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    setMessage(r.ok ? (j.status ? `Proposal ${j.status}.` : 'Saved.') : (j.error || 'Action failed'))
    if (r.ok) router.refresh()
    return r.ok
  }

  async function submitProposal(parentId?: string) {
    setBusy('submit')
    setMessage('Submitting…')
    const parsed = milestones.map((m) => ({ title: m.title.trim(), amount: Number(m.amount) }))
    await post('/api/proposals', { orderId, feeAmount: Number(fee), timelineDays: Number(timeline), note, milestones: parsed, parentProposalId: parentId ?? null })
    setBusy(null)
  }

  async function respond(decision: string) {
    if (!latest) return
    setBusy(decision)
    await post(`/api/proposals/${latest.id}/respond`, { decision })
    setBusy(null)
  }

  function updateMilestone(i: number, key: 'title' | 'amount', value: string) {
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)))
  }

  return (
    <section className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Proposal & milestones</h2>
        {latest && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{latest.status}</span>}
      </div>

      {latest && (
        <div className="mt-4 rounded-2xl border p-4 text-sm">
          <p className="font-semibold">₦{Number(latest.fee_amount).toLocaleString()}{latest.timeline_days ? ` · ${latest.timeline_days} days` : ''}</p>
          {latest.note && <p className="mt-1 text-muted-foreground">{latest.note}</p>}
        </div>
      )}

      {isBuyer && latest && latest.status !== 'accepted' && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" disabled={busy !== null} onClick={() => respond('accept')}>Accept proposal</Button>
          <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => respond('reject')}>Reject</Button>
        </div>
      )}

      {isSeller && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Fee (NGN)
              <input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="500000" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Timeline (days)
              <input type="number" min="1" value={timeline} onChange={(e) => setTimeline(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="14" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-lg border bg-background px-3 py-2.5" />
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Milestone breakdown (must add up to the fee)</p>
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m.title} onChange={(e) => updateMilestone(i, 'title', e.target.value)} placeholder="Milestone title" className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
                <input value={m.amount} onChange={(e) => updateMilestone(i, 'amount', e.target.value)} placeholder="Amount" type="number" className="w-32 rounded-lg border bg-background px-3 py-2 text-sm" />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setMilestones((p) => [...p, { title: '', amount: '' }])}>Add milestone</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" disabled={busy !== null} onClick={() => submitProposal()}>Submit proposal</Button>
            {latest && latest.status !== 'accepted' && (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => submitProposal(latest.id)}>Counter offer</Button>
            )}
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
  )
}
