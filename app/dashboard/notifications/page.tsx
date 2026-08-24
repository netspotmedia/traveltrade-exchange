import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { NotificationList } from './notification-list'

export default async function NotificationsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: notifications } = await s
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = (notifications ?? []).filter((n) => !n.read_at).length

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 pb-24 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Notifications</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your alerts</h1>
            <p className="mt-1 text-muted-foreground">
              {unread > 0 ? `${unread} unread.` : "You're all caught up."}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:inline-flex">
            <Bell className="size-4" /> Updates about your orders and account
          </span>
        </div>

        <div className="mt-6">
          <NotificationList notifications={(notifications ?? []) as NotificationRow[]} />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

type NotificationRow = { id: string; title: string; body: string; read_at: string | null; created_at: string }