"use client"
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type Notification = { id: string; title: string; body: string; read_at: string | null; created_at: string }

export function NotificationList({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read_at)
    if (unread.length === 0) return
    // Mark unread notifications as read on view (best-effort).
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: unread.map((n) => n.id) }),
    })
      .then((r) => {
        if (r.ok) setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="When something happens with your orders or account, you'll see it here."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {notifications.map((n) => {
        const unread = !n.read_at
        return (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-3 rounded-2xl border bg-card p-5 shadow-card transition',
              unread ? 'border-primary/25 bg-brand-soft/40' : 'border-border opacity-80',
            )}
          >
            <span
              className={cn(
                'mt-1.5 grid size-9 shrink-0 place-items-center rounded-xl',
                unread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Bell className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn('font-semibold', !unread && 'font-medium text-muted-foreground')}>{n.title}</p>
                {unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </div>
              {n.body && <p className="mt-1 text-sm leading-6 text-muted-foreground">{n.body}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}