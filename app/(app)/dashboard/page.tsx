import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Store,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/service-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Avatar } from '@/components/ui/avatar'
import { formatMoney, formatNumber, formatDateTime } from '@/lib/format'

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

type Msg = { id: string; order_id: string; sender_id: string; body: string; read_at: string | null; created_at: string }

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

  const [{ data: profile }, { data: wallet }, agencyRes, activeRes, notifCountRes, notifRecentRes, servicesRes] = await Promise.all([
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('wallets').select('available_balance, escrow_balance, currency').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('agencies').select('id, name').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('orders').select('*, agencies(name, owner_id), buyer:profiles(email)').eq('buyer_id', user.id).in('status', ACTIVE).is('deleted_at', null).order('created_at', { ascending: false }),
    s.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
    s.from('notifications').select('id, title, body, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    s.from('services').select('*, agencies(name, slug, verification_status, rating, city)').eq('status', 'published').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
  ])

  const agency = agencyRes.data
  const isSeller = Boolean(agency)
  const bought = (activeRes.data ?? []) as OrderRow[]

  // Seller-side data.
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

  // Deduplicated orders across buyer + seller.
  const seen = new Set<string>()
  const allOrders = [...bought, ...sold].filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
  const attentionStatuses = isSeller ? SELLER_ATTENTION : BUYER_ATTENTION
  const attention = allOrders.filter((o) => attentionStatuses.includes(o.status)).slice(0, 4)

  // Recent conversations (latest message per order, with unread counts).
  let conversations: { order: OrderRow; latest: Msg; unread: number }[] = []
  if (allOrders.length > 0) {
    const { data: msgs } = await s
      .from('order_messages')
      .select('id, order_id, sender_id, body, read_at, created_at')
      .in('order_id', allOrders.map((o) => o.id))
      .order('created_at', { ascending: false })
    const byOrder = new Map<string, Msg[]>()
    for (const m of (msgs ?? []) as Msg[]) {
      const list = byOrder.get(m.order_id) ?? []
      list.push(m)
      byOrder.set(m.order_id, list)
    }
    conversations = allOrders
      .map((o) => {
        const list = byOrder.get(o.id) ?? []
        return { order: o, latest: list[0], unread: list.filter((m) => m.sender_id !== user.id && !m.read_at).length }
      })
      .filter((c) => c.latest)
      .sort((a, b) => (b.latest.created_at > a.latest.created_at ? 1 : -1))
      .slice(0, 3)
  }

  const activeOrders = allOrders.length
  const unread = notifCountRes.count ?? 0
  const recentNotifs = (notifRecentRes.data ?? []) as { id: string; title: string; created_at: string }[]
  const recommended = (servicesRes.data ?? []) as ServiceRow[]
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 pb-24 lg:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isSeller ? "Here's what needs your attention today." : "Here's where your travel work stands."}
            </p>
          </div>
          <Link
            href={isSeller ? '/agent/services/new' : '/marketplace'}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            {isSeller ? 'New service' : 'Find a service'} <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active orders" value={formatNumber(activeOrders)} hint={attention.length > 0 ? `${attention.length} need you` : 'Nothing pending'} />
          {isSeller && (
            <StatCard label="Available balance" value={formatMoney(wallet?.available_balance, wallet?.currency)} hint={pendingRequests > 0 ? `${pendingRequests} requests waiting` : 'Ready to withdraw'} icon={WalletCards} />
          )}
          <StatCard label="Held securely" value={formatMoney(wallet?.escrow_balance, wallet?.currency)} hint="Protected against active orders" icon={ShieldCheck} />
          <StatCard label="Notifications" value={formatNumber(unread)} hint={unread > 0 ? `${unread} unread` : "You're all caught up"} />
        </div>

        {/* Needs your attention */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Needs your attention</h2>
            <Link href="/orders" className="text-sm font-semibold text-primary hover:underline">
              All orders
            </Link>
          </div>
          <div className="mt-3">
            {attention.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing needs your attention right now.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {attention.map((o) => (
                  <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{o.title}</p>
                        <StatusBadge domain="order" status={o.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{actionHint(o.status, isSeller)}</p>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
                      View <ArrowRight className="size-4" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Seller tasks */}
        {isSeller && (
          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <TaskCard
              href="/agent/requests"
              icon={Inbox}
              title="Quote requests"
              value={pendingRequests}
              hint={pendingRequests > 0 ? 'Customers are waiting for your proposal' : 'No open requests'}
            />
            <TaskCard
              href="/agent/services"
              icon={Store}
              title="Services in review"
              value={sellerServices.length}
              hint={sellerServices.length > 0 ? `${sellerServices.length} draft or pending` : 'All services live'}
            />
            <TaskCard
              href="/agent/withdrawals"
              icon={WalletCards}
              title="Withdraw earnings"
              value={Number(wallet?.available_balance) > 0 ? formatMoney(wallet?.available_balance, wallet?.currency) : '—'}
              hint="Move earnings to your bank"
            />
          </section>
        )}

        {/* Recent conversations */}
        {conversations.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent conversations</h2>
              <Link href="/messages" className="text-sm font-semibold text-primary hover:underline">
                All messages
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {conversations.map((c) => {
                const isBuyer = user.id === c.order.buyer_id
                const agency = Array.isArray(c.order.agencies) ? c.order.agencies[0] : c.order.agencies
                const buyer = Array.isArray(c.order.buyer) ? c.order.buyer[0] : c.order.buyer
                const other = isBuyer ? agency?.name || 'Travel partner' : buyer?.email || 'Customer'
                return (
                  <Link key={c.order.id} href={`/dashboard/orders/${c.order.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                    <Avatar name={other} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{other}</p>
                        {c.unread > 0 && (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">{c.unread}</span>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{c.latest.body}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.latest.created_at)}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Recent notifications */}
        {recentNotifs.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Latest alerts</h2>
              <Link href="/dashboard/notifications" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {recentNotifs.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended services */}
        {recommended.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recommended for you</h2>
              <Link href="/marketplace" className="text-sm font-semibold text-primary hover:underline">
                Browse all
              </Link>
            </div>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((svc) => {
                const a = Array.isArray(svc.agencies) ? svc.agencies[0] : svc.agencies
                return <ServiceCard key={svc.id} service={{ ...svc, agencies: a as ServiceRow['agencies'] }} />
              })}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Quick links</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-sm text-muted-foreground">{detail}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-primary" aria-hidden="true" />}
      </div>
      <p className="mt-2 truncate font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function TaskCard({ href, icon: Icon, title, value, hint }: { href: string; icon: LucideIcon; title: string; value: string | number; hint: string }) {
  return (
    <Link href={href} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-mono text-2xl font-semibold">{value}</p>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  )
}