"use client"
import { useEffect, useState } from 'react'

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

  return (
    <div className="flex flex-col gap-3">
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no notifications yet.</p>
      ) : (
        notifications.map((n) => (
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
  )
}
