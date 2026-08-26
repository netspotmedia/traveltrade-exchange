import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalHeader } from '@/components/layout/global-header'
import { Footer } from '@/components/layout/footer'
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

  // Unread message count scoped to the user's own orders. For agents, also
  // fetch the orders they sell for — both batches run in parallel.
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* Global header on every dashboard */}
      <GlobalHeader name={name} unreadNotifications={unreadNotifications} />

      <div className="flex flex-1 w-full">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
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

      {/* Footer — every dashboard closes with the global footer */}
      <div className="pb-14 lg:pb-0">
        <Footer />
      </div>

      <MobileNav role={role} unreadCount={unreadMessages} />
    </div>
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