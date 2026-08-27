import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  MessageSquareText,
  Plus,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PremiumServiceCard } from '@/components/service-card-premium'
import { Reveal } from '@/components/ui/reveal'
import { ActivityTimeline, type ActivityEntry } from '@/components/dashboard/activity-timeline'
import { TradesPanel } from '@/components/dashboard/trades-panel'
import { DashboardSearch } from '@/components/dashboard/dashboard-search'
import { ActionBanner } from '@/components/dashboard/action-banner'
import { ActivitySummary } from '@/components/dashboard/activity-summary'
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state'
import { SellerTasks } from '@/components/dashboard/seller-tasks'
import { formatMoney } from '@/lib/format'
import { publicImageUrl } from '@/lib/images'
import {
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
  images?: string[] | null
  agencies: { name: string; slug: string; verification_status: string; rating: number; city: string | null } | null
}

const QUICK_ACTIONS = [
  { href: '/marketplace', label: 'Find services', detail: 'Browse verified travel professionals', icon: BriefcaseBusiness },
  { href: '/orders', label: 'My orders', detail: 'Track your bookings', icon: ShoppingBag },
  { href: '/messages', label: 'Messages', detail: 'Chat with travel partners', icon: MessageSquareText },
]

const SELLER_ACTIONS = [
  { href: '/agent/services', label: 'My services', detail: 'Manage your listings', icon: Store },
  { href: '/agent/requests', label: 'Quote requests', detail: 'Respond to customers', icon: BriefcaseBusiness },
]

export default async function DashboardPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: wallet }, agencyRes, activeRes, notifRecentRes, servicesRes, unreadMsgRes] = await Promise.all([
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('wallets').select('available_balance, escrow_balance, currency').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('agencies').select('id, name').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('orders').select('*, agencies(name, owner_id), buyer:profiles(email)').eq('buyer_id', user.id).in('status', ACTIVE).is('deleted_at', null).order('created_at', { ascending: false }),
    s.from('notifications').select('id, title, body, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    s.from('services').select('*, agencies(name, slug, verification_status, rating, city)').eq('status', 'published').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
    s.from('order_messages').select('id', { count: 'exact', head: true }).neq('sender_id', user.id).is('read_at', null),
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
  const escrowTotal = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

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
  const unreadMessages = unreadMsgRes.count ?? 0

  const attentionTrades = trades.filter((t) => t.needsAttention).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

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
        title: 'Payment secured',
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

  const hasData = allOrders.length > 0

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-6 md:px-8 md:pt-8 lg:pb-12">
      {/* Ambient depth behind the header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(55%_100%_at_50%_-10%,var(--brand-soft),transparent)]" aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        {/* ─── Hero: Welcome + Search ─── */}
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary text-balance sm:text-4xl md:text-5xl">
                {firstName ? `${greeting}, ${firstName}` : greeting}
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-base text-on-surface-variant">
                What travel service do you need today?
              </p>
            </div>
            <Link
              href={createHref}
              className="group inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              {isSeller ? 'New service' : 'New request'}
            </Link>
          </div>
        </Reveal>

        {/* ─── Search ─── */}
        <Reveal delay={40}>
          <DashboardSearch />
        </Reveal>

        {/* ─── Action Banner (urgent items) ─── */}
        {attentionTrades.length > 0 && (
          <Reveal delay={60}>
            <ActionBanner items={attentionTrades} viewAllHref="/orders" />
          </Reveal>
        )}

        {/* ─── Activity Summary ─── */}
        <Reveal delay={80}>
          <ActivitySummary
            activeOrders={allOrders.length}
            unreadMessages={unreadMessages}
            escrowTotal={escrowTotal}
            currency={currency}
          />
        </Reveal>

        {/* ─── Empty state for new users OR Active trades + Activity ─── */}
        {!hasData ? (
          <Reveal delay={100}>
            <DashboardEmptyState isSeller={isSeller} />
          </Reveal>
        ) : (
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
        )}

        {/* ─── Seller Tasks ─── */}
        {isSeller && (
          <Reveal delay={120}>
            <SellerTasks
              pendingRequests={pendingRequests}
              draftServices={sellerServices.length}
              availableBalance={Number(wallet?.available_balance) || 0}
              currency={wallet?.currency ?? 'NGN'}
            />
          </Reveal>
        )}

        {/* ─── Recommended Services ─── */}
        {recommended.length > 0 && (
          <Reveal delay={140}>
            <section aria-label="Recommended for you">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold tracking-tight text-primary">Recommended for you</h2>
                <Link href="/marketplace" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Browse all <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((svc) => {
                  const a = Array.isArray(svc.agencies) ? svc.agencies[0] : svc.agencies
                  return (
                    <PremiumServiceCard
                      key={svc.id}
                      service={{ ...svc, agencies: a as ServiceRow['agencies'] }}
                      imageUrl={svc.images?.[0] ? publicImageUrl(svc.images[0]) : null}
                    />
                  )
                })}
              </div>
            </section>
          </Reveal>
        )}

        {/* ─── Quick Actions ─── */}
        <Reveal delay={160}>
          <section aria-label="Quick actions">
            <h2 className="font-display text-xl font-bold tracking-tight text-primary">
              {hasData ? 'Quick actions' : 'What would you like to do?'}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...QUICK_ACTIONS, ...(isSeller ? SELLER_ACTIONS : [])].slice(0, isSeller ? 5 : 4).map(({ href, label, detail, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="glass-card group flex items-center justify-between rounded-xl p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.995]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-on-primary" aria-hidden="true">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-primary">{label}</span>
                      <span className="block text-xs text-on-surface-variant">{detail}</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-on-surface-variant transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  )
}
