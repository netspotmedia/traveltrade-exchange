import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Circle, Compass, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/status-badge'
import { Reveal } from '@/components/ui/reveal'
import { EscrowActions } from './escrow-actions'
import { AgreementActions } from './agreement-actions'
import { RefundRequestForm } from './refund-request-form'
import { MessageThread } from '@/components/messages/message-thread'
import { ProposalPanel } from './proposal-panel'
import { ReviewForm } from './review-form'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'
import { formatMoney, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type MilestoneRow = { id: string; title: string; amount: number; status: string }
type ProposalRow = { id: string; fee_amount: number; timeline_days: number | null; note: string | null; status: string; created_at: string; created_by: string | null }

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
    .select('id, fee_amount, timeline_days, note, status, created_at, created_by')
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

  // Existing review (visible to the buyer of a completed order).
  const { data: existingReview } = await s.from('reviews').select('id').eq('order_id', id).maybeSingle()
  const hasReview = Boolean(existingReview)

  // Agreement + refund request for this order (both may be absent — legacy flow).
  const { data: agreement } = await s.from('agreements').select('*').eq('order_id', id).maybeSingle()
  const { data: refundReq } = await s
    .from('refund_requests')
    .select('id, amount, reason, status, rejection_reason, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Escrow funding is only available once both parties have signed the
  // agreement. We surface this in human language instead of letting the
  // funding action fail after the click.
  const buyerSigned = Boolean(agreement?.signed_by_buyer_at)
  const sellerSigned = Boolean(agreement?.signed_by_seller_at)
  const signatureState = agreement
    ? buyerSigned && sellerSigned
      ? { signed: true, hint: null }
      : {
          signed: false,
          hint: buyerSigned
            ? 'Waiting for the other party to sign the agreement. Payment becomes available after both parties sign.'
            : sellerSigned
              ? 'Sign the agreement to continue. Payment becomes available after both parties sign.'
              : 'Payment becomes available after both parties sign the agreement.',
        }
    : null

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        {/* Header */}
        <Reveal>
        <PageHeader
          title={order.title}
          description={
            <>
              {agency?.name || 'Travel partner'} · {formatMoney(order.total_amount, order.currency)} · Started {formatDate(order.created_at)}
            </>
          }
          actions={<StatusBadge domain="order" status={order.status} className="self-start text-sm" />}
        />
        </Reveal>

        {/* Progress timeline */}
        <Reveal>
        <Panel className="mt-5 p-6 sm:p-8">
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
        </Panel>
        </Reveal>

        {/* Agreement & signatures */}
        {agreement && (
          <Reveal>
          <Panel className="mt-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>Agreement & signatures</SectionTitle>
              <StatusBadge domain="agreement" status={agreement.status as string} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">
                  Buyer {agreement.signed_by_buyer_at ? '✓ signed' : '— not signed yet'}
                </p>
                {agreement.signed_by_buyer_at && (
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(agreement.signed_by_buyer_at)}</p>
                )}
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">
                  Agency {agreement.signed_by_seller_at ? '✓ signed' : '— not signed yet'}
                </p>
                {agreement.signed_by_seller_at && (
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(agreement.signed_by_seller_at)}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <AgreementActions
                agreementId={agreement.id}
                isBuyer={isBuyer}
                isSeller={isSeller}
                signedByBuyer={Boolean(agreement.signed_by_buyer_at)}
                signedBySeller={Boolean(agreement.signed_by_seller_at)}
                status={agreement.status as string}
              />
            </div>
          </Panel>
          </Reveal>
        )}

        {/* Milestones */}
        <Reveal>
        <Panel className="mt-5 p-6 sm:p-8">
          <SectionTitle>Payment plan</SectionTitle>
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
              <EscrowActions orderId={id} orderStatus={order.status} milestones={milestones} isBuyer={isBuyer} isSeller={isSeller} signatureState={signatureState} />
            </div>
          )}
        </Panel>
        </Reveal>

        <Reveal>
        <div className="mt-5">
          <ProposalPanel orderId={id} currentUserId={user.id} isBuyer={isBuyer} isSeller={isSeller} proposals={proposalList} />
        </div>

        {/* Refund request (buyer, while escrow holds funds) */}
        {isBuyer && !terminal && !refundReq && ['funded', 'in_progress', 'delivered'].includes(order.status) && (
          <div className="mt-5">
            <RefundRequestForm orderId={id} />
          </div>
        )}
        {isBuyer && refundReq && (
          <Panel className="mt-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Refund request {refundReq.status}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatMoney(refundReq.amount, order.currency)}
                  {refundReq.reason ? ` · ${refundReq.reason}` : ''}
                </p>
                {refundReq.status === 'rejected' && refundReq.rejection_reason && (
                  <p className="mt-1 text-sm text-destructive">{refundReq.rejection_reason}</p>
                )}
              </div>
              <StatusBadge domain="refund" status={refundReq.status} />
            </div>
          </Panel>
        )}
        </Reveal>

        <Reveal>
        <div className="mt-5">
          <Panel className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Messages</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Chat with your travel partner about this order.</p>
            </div>
            <MessageThread orderId={id} currentUserId={user.id} scrollClassName="max-h-96" />
          </Panel>
        </div>

        {isBuyer && order.status === 'completed' && (
          <div className="mt-5">
            <ReviewForm orderId={id} hasReview={hasReview} />
          </div>
        )}
        </Reveal>
      </main>
    </div>
  )
}