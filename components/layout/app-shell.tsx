import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Globe, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Footer } from '@/components/layout/footer'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { initials } from '@/lib/format'
import type { NavRole } from '@/lib/nav'

function resolveRole(profileRole: string | null, hasAgency: boolean): NavRole {
  if (profileRole === 'admin') return 'admin'
  if (hasAgency) return 'seller'
  return 'buyer'
}

function primaryCta(role: NavRole): { href: string; label: string } {
  if (role === 'seller') return { href: '/agent/services/new', label: 'New trade request' }
  return { href: '/requests/new', label: 'New trade request' }
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profileRes, agencyRes, notifRes, boughtOrdersRes] = await Promise.all([
    supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle(),
    supabase.from('agencies').select('id').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
    supabase.from('orders').select('id').eq('buyer_id', user.id).is('deleted_at', null),
  ])

  const profileRole = (profileRes.data?.role as string | null) ?? null
  const hasAgency = Boolean(agencyRes.data)
  const role = resolveRole(profileRole, hasAgency)
  const unreadNotifications = notifRes.count ?? 0

  const agencyId = (agencyRes.data?.id as string | null) ?? null
  const soldOrdersRes = agencyId
    ? await supabase.from('orders').select('id').eq('agency_id', agencyId).is('deleted_at', null)
    : { data: [] as { id: string }[] }

  const orderIds = new Set<string>()
  for (const o of (boughtOrdersRes.data ?? []) as { id: string }[]) orderIds.add(o.id)
  for (const o of (soldOrdersRes.data ?? []) as { id: string }[]) orderIds.add(o.id)

  let unreadMessages = 0
  if (orderIds.size > 0) {
    const { count } = await supabase
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .in('order_id', Array.from(orderIds))
      .neq('sender_id', user.id)
      .is('read_at', null)
    unreadMessages = count ?? 0
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? profileRes.data?.full_name ?? 'User'
  const cta = primaryCta(role)

  const sidebar = (
    <>
      {/* Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary-container/20" aria-hidden="true">
            <Globe className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight text-primary">TravelTrade</p>
            <p className="mt-1 text-xs text-on-surface-variant">Premium Exchange</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto pb-4">
        <SidebarNav role={role} />
      </div>

      {/* CTA */}
      <div className="mt-auto space-y-4 border-t border-white/10 pt-5">
        <Link
          href={cta.href}
          className="group flex w-full items-center justify-between rounded-full bg-primary py-2.5 pl-5 pr-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/25 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
        >
          <span>{cta.label}</span>
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-on-primary transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:scale-105"
            aria-hidden="true"
          >
            <Plus className="size-4" />
          </span>
        </Link>

        {/* Profile */}
        <div className="flex items-center gap-3 rounded-xl bg-white/40 p-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-sm font-bold text-primary" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-primary">{name}</p>
            <p className="text-xs capitalize text-on-surface-variant">{role}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </>
  )

  return (
    <div className="m3 bg-canvas flex min-h-screen flex-col text-on-surface">
      <div className="app-grain" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <MobileHeader name={name} unreadNotifications={unreadNotifications} menu={sidebar} />

      <div className="flex w-full flex-1 lg:pl-64">
        {/* Docked desktop sidebar — glass rail */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/10 bg-surface-container-low/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl lg:flex">
          {sidebar}
        </aside>

        {/* Page content — pages render their own <main id="main"> */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <div className="pb-14 lg:pb-0">
            <Footer />
          </div>
        </div>
      </div>

      <MobileNav role={role} unreadCount={unreadMessages} />
    </div>
  )
}