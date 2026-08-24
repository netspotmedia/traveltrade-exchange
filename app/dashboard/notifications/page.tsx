import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
        <div className="flex flex-col gap-3">
          {!notifications || notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no notifications yet.</p>
          ) : (
            (notifications as { id: string; title: string; body: string; read_at: string | null; created_at: string }[]).map((n) => (
              <div key={n.id} className={`rounded-2xl border bg-card p-4 ${n.read_at ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{n.title}</p>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
