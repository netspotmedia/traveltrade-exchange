import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ServiceReviewActions } from './service-review-actions'
import { WithdrawalReviewActions } from './withdrawal-review-actions'
import { DisputeReviewActions } from './dispute-review-actions'
import { FailedCallbackActions } from './failed-callback-actions'
import { RefundReviewActions } from './refund-review-actions'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'
import { Reveal } from '@/components/ui/reveal'
import { formatMoney } from '@/lib/format'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Mail,
  ShieldCheck,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react'

type ServiceRow = {
  id: string
  title: string
  category: string
  description: string
  base_price: number
  currency: string
  status: string
  created_at: string
  agencies: { name: string } | { name: string }[] | null
}

type WithdrawalRow = {
  id: string
  amount: number
  currency: string
  status: string
  bank_name: string | null
  account_name: string | null
  created_at: string
  seller: { email?: string } | null
}

type DisputeRow = {
  id: string
  reason: string
  status: string
  created_at: string
  order: { title: string } | null
}

type RefundRow = {
  id: string
  amount: number
  reason: string | null
  status: string
  created_at: string
  requester: { email?: string } | null
  order: { title: string } | null
}

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: pendingServices },
    { data: pendingWithdrawals },
    { data: openDisputes },
    { data: kpis },
    { data: summary },
    { data: emailLogs },
    { data: failedCallbacks },
    { data: pendingRefunds },
  ] = await Promise.all([
    s.from('services').select('*, agencies(name)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('withdrawals').select('*, seller:profiles(email)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('disputes').select('*, order:orders(title)').in('status', ['open', 'under_review']).is('deleted_at', null).order('created_at', { ascending: true }),
    s.rpc('admin_get_kpis'),
    s.rpc('admin_get_summary'),
    s.rpc('admin_get_email_logs', { p_limit: 50 }),
    s.rpc('admin_get_failed_callbacks', { p_limit: 50 }),
    s.from('refund_requests').select('*, requester:profiles(email), order:orders(title)').eq('status', 'pending').order('created_at', { ascending: true }),
  ])

  const kpi = kpis as { escrow_held?: number; fees_collected?: number; active_orders?: number; verified_agencies?: number; published_services?: number; total_users?: number } | null
  const summ = summary as { pending_withdrawals?: number; open_disputes?: number; failed_emails?: number } | null
  const logs = (emailLogs ?? []) as { id: string; recipient: string; subject: string; provider: string; status: string; attempts: number; error: string | null; created_at: string }[]
  const callbacks = (failedCallbacks ?? []) as { id: string; reference: string; reason: string | null; amount: number | null; currency: string | null; status: string; retry_count: number; created_at: string }[]

  const totalPendingActions = (pendingServices?.length ?? 0) + (pendingWithdrawals?.length ?? 0) + (openDisputes?.length ?? 0) + (pendingRefunds?.length ?? 0)

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
          <Reveal>
            <PageHeader title="Platform overview" />
          </Reveal>

          {/* ─── Pending Actions Banner ─── */}
          {totalPendingActions > 0 && (
            <Reveal delay={20}>
              <div className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-gradient-to-r from-accent-soft via-background to-accent-soft p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent" aria-hidden="true">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-primary">
                    {totalPendingActions} item{totalPendingActions === 1 ? '' : 's'} need your attention
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Service approvals, withdrawals, disputes, and refund requests are awaiting review.
                  </p>
                </div>
              </div>
            </Reveal>
          )}

          {/* ─── KPI Grid ─── */}
          <Reveal delay={40}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiTile
                icon={WalletCards}
                label="Escrow held"
                value={formatMoney(kpi?.escrow_held ?? 0, 'NGN')}
                accent="bg-primary/10 text-primary"
              />
              <KpiTile
                icon={CreditCard}
                label="Fees collected"
                value={formatMoney(kpi?.fees_collected ?? 0, 'NGN')}
                accent="bg-secondary/10 text-secondary"
              />
              <KpiTile
                icon={FileText}
                label="Active orders"
                value={String(kpi?.active_orders ?? 0)}
                accent="bg-accent/10 text-accent"
              />
              <KpiTile
                icon={ShieldCheck}
                label="Verified agencies"
                value={String(kpi?.verified_agencies ?? 0)}
                accent="bg-success/40 text-success-foreground"
              />
              <KpiTile
                icon={FileText}
                label="Published services"
                value={String(kpi?.published_services ?? 0)}
                accent="bg-info/40 text-info-foreground"
              />
              <KpiTile
                icon={Users}
                label="Total users"
                value={String(kpi?.total_users ?? 0)}
                accent="bg-muted text-on-surface"
              />
            </div>
          </Reveal>

          {/* ─── Queues ─── */}
          <Reveal delay={60}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QueueTile
                icon={FileText}
                label="Service approvals"
                count={pendingServices?.length ?? 0}
                href="#service-approvals"
                accent="bg-accent/10 text-accent"
              />
              <QueueTile
                icon={WalletCards}
                label="Withdrawals"
                count={pendingWithdrawals?.length ?? 0}
                href="#withdrawals"
                accent="bg-secondary/10 text-secondary"
              />
              <QueueTile
                icon={AlertTriangle}
                label="Open disputes"
                count={openDisputes?.length ?? 0}
                href="#disputes"
                accent="bg-destructive/10 text-destructive"
              />
              <QueueTile
                icon={XCircle}
                label="Refund requests"
                count={pendingRefunds?.length ?? 0}
                href="#refunds"
                accent="bg-warning/40 text-warning-foreground"
              />
            </div>
          </Reveal>

          {/* ─── Service Approvals ─── */}
          <Reveal delay={80}>
            <Panel id="service-approvals" className="p-6">
              <SectionTitle>Pending service approvals</SectionTitle>
              <div className="mt-4 flex flex-col gap-3">
                {!pendingServices || pendingServices.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No services awaiting moderation.</p>
                ) : (
                  (pendingServices as ServiceRow[]).map((svc) => {
                    const agency = Array.isArray(svc.agencies) ? svc.agencies[0] : svc.agencies
                    return (
                      <div key={svc.id} className="rounded-2xl border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{svc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {agency?.name || 'Unknown agency'} · {svc.category} · {formatMoney(svc.base_price, svc.currency)}
                            </p>
                          </div>
                          <StatusBadge domain="service" status={svc.status} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{svc.description}</p>
                        <ServiceReviewActions serviceId={svc.id} />
                      </div>
                    )
                  })
                )}
              </div>
            </Panel>
          </Reveal>

          {/* ─── Withdrawals ─── */}
          <Reveal delay={100}>
            <Panel id="withdrawals" className="p-6">
              <SectionTitle>Pending withdrawals</SectionTitle>
              <div className="mt-4 flex flex-col gap-3">
                {!pendingWithdrawals || pendingWithdrawals.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No withdrawals awaiting processing.</p>
                ) : (
                  (pendingWithdrawals as WithdrawalRow[]).map((w) => (
                    <div key={w.id} className="rounded-2xl border p-4 transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{formatMoney(w.amount, w.currency)}</p>
                          <p className="text-sm text-muted-foreground">
                            {w.bank_name || 'Unknown bank'} · {w.account_name || 'Unknown name'} · {w.seller?.email || 'no email'}
                          </p>
                        </div>
                        <StatusBadge domain="withdrawal" status={w.status} />
                      </div>
                      <WithdrawalReviewActions withdrawalId={w.id} />
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>

          {/* ─── Disputes ─── */}
          <Reveal delay={120}>
            <Panel id="disputes" className="p-6">
              <SectionTitle>Open disputes</SectionTitle>
              <div className="mt-4 flex flex-col gap-3">
                {!openDisputes || openDisputes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No open disputes.</p>
                ) : (
                  (openDisputes as DisputeRow[]).map((d) => (
                    <div key={d.id} className="rounded-2xl border p-4 transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{d.order?.title || 'Order dispute'}</p>
                          <p className="text-sm text-muted-foreground">{d.reason}</p>
                        </div>
                        <StatusBadge domain="dispute" status={d.status} />
                      </div>
                      <DisputeReviewActions disputeId={d.id} />
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>

          {/* ─── Refunds ─── */}
          <Reveal delay={140}>
            <Panel id="refunds" className="p-6">
              <SectionTitle>Pending refunds</SectionTitle>
              <div className="mt-4 flex flex-col gap-3">
                {!pendingRefunds || (pendingRefunds as RefundRow[]).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No refund requests awaiting review.</p>
                ) : (
                  (pendingRefunds as RefundRow[]).map((r) => (
                    <div key={r.id} className="rounded-2xl border p-4 transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{formatMoney(r.amount)} {r.order?.title || 'Order refund'}</p>
                          <p className="text-sm text-muted-foreground">
                            {r.requester?.email || 'No email'} · {new Date(r.created_at).toLocaleDateString()}
                          </p>
                          {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                        </div>
                        <StatusBadge domain="refund" status={r.status} />
                      </div>
                      <RefundReviewActions refundId={r.id} />
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>

          {/* ─── Email Activity ─── */}
          <Reveal delay={160}>
            <Panel className="p-6">
              <SectionTitle>Recent email activity</SectionTitle>
              <div className="mt-4 flex flex-col gap-2">
                {!logs || logs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No email activity yet.</p>
                ) : (
                  logs.slice(0, 20).map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 py-3 text-sm last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.recipient} · {e.provider} · {e.attempts} attempt{e.attempts === 1 ? '' : 's'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.status === 'sent' ? 'bg-success/40 text-success-foreground' : e.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {e.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>

          {/* ─── Failed Callbacks ─── */}
          <Reveal delay={180}>
            <Panel className="p-6">
              <SectionTitle>Failed payment callbacks</SectionTitle>
              <div className="mt-4 flex flex-col gap-2">
                {!callbacks || callbacks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No unresolved payment callbacks.</p>
                ) : (
                  callbacks.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 py-3 text-sm last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.reference}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.reason || 'No reason'} {c.amount ? ` · ${formatMoney(c.amount, c.currency)}` : ''} · {c.retry_count} retry{c.retry_count === 1 ? '' : 'ies'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning/40 text-warning-foreground">
                          {c.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        <FailedCallbackActions callbackId={c.id} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>
        </div>
      </main>
    </div>
  )
}

function KpiTile({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent: string }) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-xl p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accent}`} aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold tracking-tight text-primary">{value}</p>
      </div>
    </div>
  )
}

function QueueTile({ icon: Icon, label, count, href, accent }: { icon: typeof Users; label: string; count: number; href: string; accent: string }) {
  return (
    <a
      href={href}
      className="glass-card group flex items-center gap-4 rounded-xl p-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accent}`} aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold tracking-tight text-primary">{count}</p>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
    </a>
  )
}
