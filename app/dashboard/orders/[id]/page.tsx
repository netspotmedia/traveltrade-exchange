import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Circle, Compass, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { EscrowActions } from './escrow-actions'
import { MessageThread } from './message-thread'
import { ProposalPanel } from './proposal-panel'
import { formatMoney, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type MilestoneRow = { id: string; title: string; amount: number; status: string }
type ProposalRow = { id: string; fee_amount: number; timeline_days: number | null; note: string | null; status: string; created_at: string }

const TIMELINE = [
  { key: 'agreed', label: 'Agreement' },
  { key: 'secured', label: 'Payment secured' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Completed' },
]

function timelineProgress(status: string): number {
  switch (status) {
    case 'proposed':
      return 1
    case 'funded':
      return 2
    case 'in_progress':
    case 'delivered':
      return 3
    case 'completed':
      return 4
    default:
      return 0
  }
}

function nextStep(status: string, isBuyer: boolean): string {
  switch (status) {
    case 'proposed':
      return isBuyer ? 'Agree on the plan with the agent, then secure your payment.' : 'Respond to the request with a proposal so the buyer can review it.'
    case 'funded':
      return isBuyer ? 'Your payment is secured. The agent can now start work.' : 'Your payment is secured. Start work and submit the first milestone when ready.'
    case 'in_progress':
      return isBuyer ? 'Review delivery as it is submitted, and approve milestones you are happy with.' : 'Submit each milestone for review when the work is ready.'
    case 'delivered':
      return isBuyer ? 'Review the delivered work and approve it to release payment.' : 'Work is delivered. Waiting for the buyer to review and approve.'
    case 'disputed':
      return 'A dispute is under review. Our team will release funds fairly once resolved.'
    case 'cancelled':
      return 'This order was cancelled.'
    case 'completed':
      return 'This order is complete. Thank you!'
    default:
      return 'Follow the milestones below to keep this order moving.'
  }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: order } = await s
    .from('orders')
    .select('*, services(title), agencies(name, owner_id), milestones(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) notFound()

  const { data: proposals } = await s
    .from('proposals')
    .select('id, fee_amount, timeline_days, note, status, created_at')
    .eq('order_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const milestones = (order.milestones ?? []) as MilestoneRow[]
  const proposalList = (proposals ?? []) as ProposalRow[]
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === agency?.owner_id
  const progress = timelineProgress(order.status)
  const terminal = ['completed', 'cancelled'].includes(order.status)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">Order</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{order.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {agency?.name || 'Travel partner'} · {formatMoney(order.total_amount, order.currency)} · Started {formatDate(order.created_at)}
            </p>
          </div>
          <StatusBadge domain="order" status={order.status} className="self-start text-sm" />
        </div>

        {/* Progress timeline */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-2 text-sm">
            {order.status === 'disputed' ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            ) : order.status === 'cancelled' ? (
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Compass className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <p className="leading-6 text-muted-foreground">{nextStep(order.status, isBuyer)}</p>
          </div>

          {!terminal && order.status !== 'disputed' && (
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {TIMELINE.map((t, i) => {
                const done = i < progress
                const current = i === progress - 1
                return (
                  <li key={t.key} className="flex flex-col items-center gap-2 text-center">
                    <span
                      className={cn(
                        'grid size-8 place-items-center rounded-full border text-xs',
                        done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
                        current && 'ring-2 ring-primary/30',
                      )}
                    >
                      {done ? <CheckCircle2 className="size-4" /> : <span>{i + 1}</span>}
                    </span>
                    <span className={cn('text-[11px] font-medium leading-tight', done ? 'text-foreground' : 'text-muted-foreground')}>{t.label}</span>
                  </li>
                )
              })}
            </ol>
          )}

          {order.status === 'funded' && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-info/30 px-4 py-3 text-sm text-info-foreground">
              <Lock className="size-4 shrink-0" />
              Your payment is secured in escrow. It is only released when you approve the delivered work.
            </div>
          )}
        </section>

        {/* Milestones */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold">Payment plan</h2>
          <div className="mt-4 flex flex-col gap-3">
            {milestones.length === 0 && <p className="text-sm text-muted-foreground">The payment plan is agreed with the agent before anything is funded.</p>}
            {milestones.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
                <div className="min-w-0">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(m.amount, order.currency)}</p>
                </div>
                <StatusBadge domain="milestone" status={m.status} />
              </div>
            ))}
          </div>
          {milestones.length > 0 && (
            <div className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
              {isBuyer
                ? 'Release each milestone only when you are happy with the delivered work.'
                : 'Submit each milestone for review when the work is ready. The buyer releases payment after approval.'}
            </div>
          )}
          {!terminal && order.status !== 'disputed' && (
            <div className="mt-5">
              <EscrowActions orderId={id} orderStatus={order.status} milestones={milestones} isBuyer={isBuyer} isSeller={isSeller} />
            </div>
          )}
        </section>

        <div className="mt-5">
          <ProposalPanel orderId={id} isBuyer={isBuyer} isSeller={isSeller} proposals={proposalList} />
        </div>

        <div className="mt-5">
          <MessageThread orderId={id} currentUserId={user.id} />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}