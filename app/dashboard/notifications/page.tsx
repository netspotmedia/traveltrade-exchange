import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Notifications</p>
          <h1 className="mt-2 text-3xl font-semibold">Your notifications</h1>
        </div>
        <NotificationList notifications={(notifications ?? []) as { id: string; title: string; body: string; read_at: string | null; created_at: string }[]} />
      </div>
    </main>
  )
}
