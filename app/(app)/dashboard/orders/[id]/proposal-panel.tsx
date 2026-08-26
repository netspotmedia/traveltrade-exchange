"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/format'

type Proposal = {
  id: string
  fee_amount: number
  timeline_days: number | null
  note: string | null
  status: string
  created_at: string
  created_by: string | null
}

const ACTIONABLE = ['pending', 'submitted', 'countered']

export function ProposalPanel({
  orderId,
  currentUserId,
  isBuyer,
  isSeller,
  proposals,
}: {
  orderId: string
  currentUserId: string
  isBuyer: boolean
  isSeller: boolean
  proposals: Proposal[]
}) {
  const [fee, setFee] = useState('')
  const [timeline, setTimeline] = useState('')
  const [note, setNote] = useState('')
  const [buyerFee, setBuyerFee] = useState('')
  const [buyerNote, setBuyerNote] = useState('')
  const [milestones, setMilestones] = useState([{ title: '', amount: '' }])
  const [showBuyerCounter, setShowBuyerCounter] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  const latest = proposals[0] ?? null
  // A proposal is "mine" if I created it. The buyer can only act on a
  // seller's proposal, and the seller only counters the latest one.
  const latestIsMine = Boolean(latest && latest.created_by === currentUserId)
  const latestActionable = Boolean(latest && ACTIONABLE.includes(latest.status))

  async function post(path: string, body: Record<string, unknown>) {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    setMessage(r.ok ? { kind: 'ok', text: j.status ? `Proposal ${j.status}.` : 'Saved.' } : { kind: 'err', text: j.error || 'Action failed' })
    if (r.ok) router.refresh()
    return r.ok
  }

  async function submitProposal(parentId?: string) {
    setBusy('submit')
    setMessage(null)
    const parsed = milestones.map((m) => ({ title: m.title.trim(), amount: Number(m.amount) }))
    await post('/api/proposals', { orderId, feeAmount: Number(fee), timelineDays: Number(timeline), note, milestones: parsed, parentProposalId: parentId ?? null })
    setBusy(null)
  }

  async function submitBuyerCounter() {
    if (!latest) return
    setBusy('counter')
    setMessage(null)
    await post('/api/proposals', { orderId, feeAmount: Number(buyerFee), timelineDays: null, note: buyerNote, milestones: [], parentProposalId: latest.id })
    setShowBuyerCounter(false)
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
    <section className="rounded-2xl border border-border bg-card surface-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Proposal & milestones</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Agree on the plan before any payment moves.</p>
        </div>
        {latest && <StatusBadge domain="proposal" status={latest.status} />}
      </div>

      <div className="p-5 sm:p-6">
        {latest && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-border bg-background/60 p-4 text-sm">
            <p className="font-mono text-lg font-semibold">{formatMoney(latest.fee_amount)}</p>
            {latest.timeline_days ? <span className="text-muted-foreground">{latest.timeline_days} days</span> : null}
            {latest.note && <p className="w-full text-muted-foreground">{latest.note}</p>}
          </div>
        )}

        {/* Buyer can accept, reject, or counter a seller's proposal */}
        {isBuyer && latest && !latestIsMine && latestActionable && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="sm" disabled={busy !== null} onClick={() => respond('accept')}>
              Accept proposal
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setShowBuyerCounter((v) => !v)}>
              Counter offer
            </Button>
            <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => respond('reject')}>
              Reject
            </Button>
          </div>
        )}

        {/* Buyer counter form — adjust the total price; milestones rescale */}
        {isBuyer && showBuyerCounter && latest && !latestIsMine && latestActionable && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-medium">Counter the seller&apos;s offer with your price</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Your fee (NGN)
                <Input type="number" min="1" inputMode="numeric" value={buyerFee} onChange={(e) => setBuyerFee(e.target.value)} placeholder="380000" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Note (optional)
                <Input value={buyerNote} onChange={(e) => setBuyerNote(e.target.value)} placeholder="Scope or reason for the price" />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" disabled={busy !== null || !buyerFee} onClick={submitBuyerCounter}>
                Send counter offer
              </Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setShowBuyerCounter(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isSeller && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Fee (NGN)
                <Input type="number" min="1" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500000" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Timeline (days)
                <Input type="number" min="1" inputMode="numeric" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="14" />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Note
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Scope, inclusions, anything the buyer should know." />
            </label>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Milestone breakdown <span className="text-muted-foreground">(must add up to the fee)</span></p>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMilestones((p) => [...p, { title: '', amount: '' }])}
                className="w-fit"
              >
                <Plus className="size-4" /> Add milestone
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="sm" disabled={busy !== null} onClick={() => submitProposal()}>
                Submit proposal
              </Button>
              {latest && latestActionable && (
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => submitProposal(latest.id)}>
                  Counter offer
                </Button>
              )}
            </div>
          </div>
        )}

        {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
      </div>
    </section>
  )
}