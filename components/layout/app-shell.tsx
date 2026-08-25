import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/layout/logo'
import type { NavRole } from '@/lib/nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'

function resolveRole(profileRole: string | null, hasAgency: boolean): NavRole {
  if (profileRole === 'admin') return 'admin'
  if (hasAgency) return 'seller'
  return 'buyer'
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profileRes, agencyRes, notifRes] = await Promise.all([
    supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle(),
    supabase.from('agencies').select('id').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ])

  const profileRole = (profileRes.data?.role as string | null) ?? null
  const hasAgency = Boolean(agencyRes.data)
  const role = resolveRole(profileRole, hasAgency)
  const unreadNotifications = notifRes.count ?? 0

  // Unread message count scoped to the user's own orders (buyer or owned agency).
  let unreadMessages = 0
  const agencyId = (agencyRes.data?.id as string | null) ?? null
  const ownOrderQuery = agencyId
    ? supabase.from('orders').select('id').or(`buyer_id.eq.${user.id},agency_id.eq.${agencyId}`).is('deleted_at', null)
    : supabase.from('orders').select('id').eq('buyer_id', user.id).is('deleted_at', null)
  const { data: ownOrders } = await ownOrderQuery
  const orderIds = (ownOrders ?? []).map((o) => o.id as string).filter(Boolean)
  if (orderIds.length > 0) {
    const { count } = await supabase
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .in('order_id', orderIds)
      .neq('sender_id', user.id)
      .is('read_at', null)
    unreadMessages = count ?? 0
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? profileRes.data?.full_name ?? 'User'

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
          >
            <BellIcon />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/settings/security"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
            aria-label={`${name}'s account`}
          >
            {name.charAt(0).toUpperCase()}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-border px-4">
            <Logo />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-4">
            <SidebarNav role={role} />
          </div>
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                <p className="text-xs capitalize text-muted-foreground">{role}</p>
              </div>
            </div>
            <div className="mt-3">
              <SignOutButton />
            </div>
          </div>
        </aside>

        {/* Page content — pages render their own <main id="main"> */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <MobileNav role={role} unreadCount={unreadMessages} />
    </div>
  )
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

async function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server'
        const s = await createClient()
        await s.auth.signOut()
        redirect('/')
      }}
    >
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  )
}