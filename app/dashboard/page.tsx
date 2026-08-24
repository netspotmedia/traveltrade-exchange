import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Inbox,
  ShieldCheck,
  Store,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { formatMoney, formatNumber } from '@/lib/format'

const ACTIVE_STATUSES = ['proposed', 'funded', 'in_progress', 'delivered', 'disputed']

type Workspace = { href: string; label: string; detail: string; icon: LucideIcon; showFor: 'all' | 'seller' }

const WORKSPACES: Workspace[] = [
  { href: '/marketplace', label: 'Find services', detail: 'Browse verified travel professionals', icon: BriefcaseBusiness, showFor: 'all' },
  { href: '/orders', label: 'Orders', detail: 'Track active agreements', icon: FileText, showFor: 'all' },
  { href: '/dashboard/wallet', label: 'Wallet', detail: 'Your balance and activity', icon: WalletCards, showFor: 'all' },
  { href: '/agent/services', label: 'Sell services', detail: 'Create and manage your services', icon: Store, showFor: 'seller' },
  { href: '/agent/requests', label: 'Quote requests', detail: 'Respond to incoming requests', icon: Inbox, showFor: 'seller' },
]

export default async function DashboardPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: wallet }, agencyRes, ownedRes, notifRes] = await Promise.all([
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('wallets').select('available_balance, escrow_balance, currency').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('agencies').select('id').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', user.id).in('status', ACTIVE_STATUSES).is('deleted_at', null),
    s.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ])

  const agency = agencyRes.data
  const soldRes = agency
    ? await s.from('orders').select('id', { count: 'exact', head: true }).eq('agency_id', agency.id).in('status', ACTIVE_STATUSES).is('deleted_at', null)
    : null
  const activeOrders = (ownedRes.count ?? 0) + (soldRes?.count ?? 0)
  const unread = notifRes.count ?? 0
  const isSeller = profile?.role === 'seller'
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? null

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 pb-24 lg:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
            </h1>
            <p className="mt-1 text-muted-foreground">Here's where your travel work stands.</p>
          </div>
          <Link href="/marketplace" className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
            Find a service <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Active orders" value={formatNumber(activeOrders)} hint={activeOrders > 0 ? 'Need attention' : 'Nothing active'} />
          <StatCard label="Held securely" value={formatMoney(wallet?.escrow_balance, wallet?.currency)} hint="Protected against active orders" icon={ShieldCheck} />
          <StatCard label="Notifications" value={formatNumber(unread)} hint={unread > 0 ? `${unread} unread` : "You're all caught up"} />
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Jump back in</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {WORKSPACES.filter((w) => w.showFor === 'all' || isSeller).map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
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

        <section className="mt-8 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <ShieldCheck className="size-6" />
          <h2 className="mt-4 text-xl font-semibold">Trust is the product.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-primary-foreground/80">
            Every agreement is structured around clear milestones, verified agents and protected payments — so you always know where things stand.
          </p>
        </section>
      </main>
      <BottomNav />
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-primary" />}
      </div>
      <p className="mt-2 truncate font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}