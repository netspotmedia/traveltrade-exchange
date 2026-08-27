import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Inbox,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Store,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/service-card'
import { Reveal } from '@/components/ui/reveal'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { AnimatedCounter } from '@/components/dashboard/animated-counter'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { SecurityGauge } from '@/components/dashboard/security-gauge'
import { TradesPanel } from '@/components/dashboard/trades-panel'
import { ActivityTimeline, type ActivityEntry } from '@/components/dashboard/activity-timeline'
import { formatMoney, formatNumber } from '@/lib/format'
import {
  monthDelta,
  monthlyBuckets,
  securityScore,
  standingLabel,
  timeAgo,
  type TradeRow,
} from '@/lib/dashboard'

const ACTIVE = ['proposed', 'funded', 'in_progress', 'delivered', 'disputed']

const BUYER_ATTENTION = ['proposed', 'in_progress', 'delivered', 'disputed']
const SELLER_ATTENTION = ['proposed', 'in_progress', 'disputed']

function actionHint(status: string, isSeller: boolean): string {
  switch (status) {
    case 'proposed':
      return isSeller ? 'Send a proposal to this request' : 'Agree on the plan and secure your payment'
    case 'in_progress':
      return isSeller ? 'Submit the next milestone for review' : "Review progress and approve what you're happy with"
    case 'delivered':
      return 'Review the delivered work'
    case 'disputed':
      return 'View the open dispute'
    default:
      return 'View order'
  }
}

type OrderRow = {
  id: string
  title: string
  status: string
  total_amount: number
  currency: string
  created_at: string
  buyer_id: string
  agencies: { name: string; owner_id: string } | { name: string; owner_id: string }[] | null
  buyer?: { email?: string } | { email?: string }[] | null
}

type Notif = { id: string; title: string; body: string | null; created_at: string }

type ServiceRow = {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  location: string | null
  base_price: number
  currency: string
  ordering_mode: string | null
  agencies: { name: string; slug: string; verification_status: string; rating: number; city: string | null } | null
}

export default async function DashboardPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: wallet }, agencyRes, activeRes, notifRecentRes, servicesRes] = await Promise.all([
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('wallets').select('available_balance, escrow_balance, currency').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('agencies').select('id, name').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('orders').select('*, agencies(name, owner_id), buyer:profiles(email)').eq('buyer_id', user.id).in('status', ACTIVE).is('deleted_at', null).order('created_at', { ascending: false }),
    s.from('notifications').select('id, title, body, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    s.from('services').select('*, agencies(name, slug, verification_status, rating, city)').eq('status', 'published').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
  ])

  const agency = agencyRes.data
  const isSeller = Boolean(agency)
  const bought = (activeRes.data ?? []) as OrderRow[]

  let sold: OrderRow[] = []
  let pendingRequests = 0
  let sellerServices: { id: string; title: string; status: string }[] = []
  if (agency) {
    const [soldRes, pendingRes, servicesRes2] = await Promise.all([
      s.from('orders').select('*, agencies(name, owner_id), buyer:profiles(email)').eq('agency_id', agency.id).in('status', ACTIVE).is('deleted_at', null).order('created_at', { ascending: false }),
      s.from('orders').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id).eq('status', 'proposed').is('deleted_at', null),
      s.from('services').select('id, title, status').eq('agency_id', agency.id).in('status', ['draft', 'pending']).is('deleted_at', null).order('created_at', { ascending: false }).limit(4),
    ])
    sold = (soldRes.data ?? []) as OrderRow[]
    pendingRequests = pendingRes.count ?? 0
    sellerServices = (servicesRes2.data ?? []) as { id: string; title: string; status: string }[]
  }

  const seen = new Set<string>()
  const allOrders = [...bought, ...sold].filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
  const attentionStatuses = isSeller ? SELLER_ATTENTION : BUYER_ATTENTION
  const attention = allOrders.filter((o) => attentionStatuses.includes(o.status))

  const currency = wallet?.currency ?? 'NGN'
  const buckets = monthlyBuckets(allOrders, 12)
  const escrowTotal = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
  const delta = monthDelta(buckets)
  const disputedCount = allOrders.filter((o) => o.status === 'disputed').length
  const score = securityScore(disputedCount, attention.length)

  const partnerNames = new Set<string>()
  for (const o of allOrders) {
    const isBuyerSide = user.id === o.buyer_id
    const agencyRow = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
    const buyerRow = Array.isArray(o.buyer) ? o.buyer[0] : o.buyer
    const name = isBuyerSide ? agencyRow?.name ?? 'Travel partner' : buyerRow?.email ?? 'Customer'
    partnerNames.add(name)
  }

  const trades: TradeRow[] = allOrders.map((o) => {
    const isBuyerSide = user.id === o.buyer_id
    const agencyRow = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
    const buyerRow = Array.isArray(o.buyer) ? o.buyer[0] : o.buyer
    return {
      id: o.id,
      title: o.title,
      status: o.status,
      amount: Number(o.total_amount) || 0,
      currency: o.currency || currency,
      partner: isBuyerSide ? agencyRow?.name ?? 'Travel partner' : buyerRow?.email ?? 'Customer',
      createdAt: o.created_at,
      needsAttention: attentionStatuses.includes(o.status),
      hint: actionHint(o.status, isSeller),
    }
  })

  const recentNotifs = (notifRecentRes.data ?? []) as Notif[]

  const timeline: ActivityEntry[] = [
    ...recentNotifs.map((n) => ({
      id: `n-${n.id}`,
      kind: 'alert' as const,
      title: n.title,
      body: n.body ?? '',
      iso: n.created_at,
      label: timeAgo(n.created_at),
    })),
    ...allOrders
      .filter((o) => o.status === 'funded')
      .map((o) => ({
        id: `e-${o.id}`,
        kind: 'escrow' as const,
        title: 'Payment received',
        body: `Escrow funds secured for ${o.title} (${formatMoney(o.total_amount, o.currency)})`,
        iso: o.created_at,
        label: timeAgo(o.created_at),
      })),
    ...allOrders
      .filter((o) => o.status === 'disputed')
      .map((o) => ({
        id: `d-${o.id}`,
        kind: 'attention' as const,
        title: 'Dispute open',
        body: `${o.title} now requires review.`,
        iso: o.created_at,
        label: timeAgo(o.created_at),
      })),
    ...allOrders
      .filter((o) => o.status === 'delivered')
      .map((o) => ({
        id: `l-${o.id}`,
        kind: 'done' as const,
        title: 'Milestone delivered',
        body: `${o.title} was marked as delivered.`,
        iso: o.created_at,
        label: timeAgo(o.created_at),
      })),
  ]
    .sort((a, b) => (b.iso > a.iso ? 1 : -1))
    .slice(0, 7)

  const recommended = (servicesRes.data ?? []) as ServiceRow[]
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? null
  const createHref = isSeller ? '/agent/services/new' : '/requests/new'

  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-8 md:px-8 md:pt-10 lg:pb-12">
      {/* Ambient depth behind the header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(55%_100%_at_50%_-10%,var(--brand-soft),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-40 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--secondary-fixed) 45%,transparent),transparent)] blur-2xl" aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        {/* Page header */}
        <Reveal>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary text-balance sm:text-4xl md:text-5xl">Trade Overview</h1>
              <p className="mt-2 max-w-2xl text-pretty text-lg text-on-surface-variant">
                Monitor your active escrow trades and market performance{firstName ? `, ${firstName}` : ''}.
              </p>
            </div>
            <Link
              href={createHref}
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-primary py-2.5 pl-6 pr-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/25 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
            >
              <span>New Trade Request</span>
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-on-primary transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:scale-105"
                aria-hidden="true"
              >
                <Plus className="size-4" />
              </span>
            </Link>
          </div>
        </Reveal>

        {/* KPI bento */}
        <Reveal delay={80}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              accent="solid"
              icon={WalletCards}
              label="Total Escrow Volume"
              value={<AnimatedCounter value={escrowTotal} mode="money" currency={currency} />}
              hint={delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% this month` : `${allOrders.length} trades in escrow`}
            />
            <KpiCard
              accent="mint"
              icon={ArrowLeftRight}
              label="Active Trades"
              value={<AnimatedCounter value={allOrders.length} />}
              hint={attention.length > 0 ? `${attention.length} require attention` : 'Nothing pending'}
            />
            <KpiCard
              accent="gold"
              icon={ShieldCheck}
              label="Security Score"
              value={<AnimatedCounter value={score} mode="percent" />}
              hint={standingLabel(score)}
            >
              <SecurityGauge value={score} size="sm" />
            </KpiCard>
            <KpiCard
              accent="surface"
              icon={BadgeCheck}
              label="Verified Partners"
              value={<AnimatedCounter value={partnerNames.size} />}
              hint="Across your trade network"
            />
          </div>
        </Reveal>

        {/* Market performance */}
        <Reveal delay={140}>
          <section className="glass-panel rounded-3xl p-6 md:p-8" aria-label="Market performance">
            <PerformanceChart data={buckets} currency={currency} />
          </section>
        </Reveal>

        {/* Trades + activity */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TradesPanel trades={trades} viewAllHref="/orders" createHref={createHref} />
          </div>
          <section className="glass-panel flex h-full flex-col rounded-3xl p-6 md:p-7" aria-label="Recent activity">
            <h3 className="font-display text-xl font-semibold tracking-tight text-primary">Recent Activity</h3>
            <div className="mt-5 flex-grow">
              <ActivityTimeline entries={timeline} viewAllHref="/dashboard/notifications" />
            </div>
          </section>
        </div>

        {/* Seller tasks */}
        {isSeller && (
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Tasks">
            <TaskCard href="/agent/requests" icon={Inbox} title="Quote requests" value={formatNumber(pendingRequests)} hint={pendingRequests > 0 ? 'Customers are waiting for your proposal' : 'No open requests'} />
            <TaskCard href="/agent/services" icon={Store} title="Services in review" value={`${sellerServices.length}`} hint={sellerServices.length > 0 ? `${sellerServices.length} draft or pending` : 'All services live'} />
            <TaskCard href="/agent/withdrawals" icon={WalletCards} title="Withdraw earnings" value={Number(wallet?.available_balance) > 0 ? formatMoney(wallet?.available_balance, wallet?.currency) : '—'} hint="Move earnings to your bank" />
          </section>
        )}

        {/* Recommended services */}
        {recommended.length > 0 && (
          <section aria-label="Recommended for you">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight text-primary">Recommended for you</h2>
              <Link href="/marketplace" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Browse all <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((svc) => {
                const a = Array.isArray(svc.agencies) ? svc.agencies[0] : svc.agencies
                return <ServiceCard key={svc.id} service={{ ...svc, agencies: a as ServiceRow['agencies'] }} />
              })}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section aria-label="Quick links">
          <h2 className="font-display text-xl font-semibold tracking-tight text-primary">Quick links</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/marketplace', label: 'Find services', detail: 'Browse verified travel professionals', icon: BriefcaseBusiness },
              { href: '/orders', label: 'Orders', detail: 'Track your agreements', icon: FileText },
              { href: '/messages', label: 'Messages', detail: 'Chat with your travel partners', icon: MessageSquareText },
              { href: '/dashboard/wallet', label: 'Wallet', detail: 'Add funds for secure payment', icon: WalletCards },
              ...(isSeller
                ? [
                    { href: '/agent/services', label: 'Sell services', detail: 'Manage your services', icon: Store },
                    { href: '/agent/requests', label: 'Quote requests', detail: 'Respond to customers', icon: Inbox },
                  ]
                : []),
            ].map(({ href, label, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="glass-card group flex items-center justify-between rounded-xl p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.995]"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-primary-fixed/40 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-on-primary" aria-hidden="true">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-primary">{label}</span>
                    <span className="block text-sm text-on-surface-variant">{detail}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-on-surface-variant transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function TaskCard({ href, icon: Icon, title, value, hint }: { href: string; icon: LucideIcon; title: string; value: string; hint: string }) {
  return (
    <Link
      href={href}
      className="glass-card group flex flex-col gap-3 rounded-xl p-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.995]"
    >
      <span className="grid size-10 place-items-center rounded-full bg-primary-fixed/40 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-on-primary" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight text-primary">{value}</p>
        <p className="text-sm font-bold text-primary">{title}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
      </div>
    </Link>
  )
}