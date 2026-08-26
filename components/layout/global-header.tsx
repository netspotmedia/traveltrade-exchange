import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

/** Global app header — brand left, live notifications + profile right.
 *  Shared by every dashboard via AppShell. */
export function GlobalHeader({ name, unreadNotifications }: { name: string; unreadNotifications: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <Logo />

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
          >
            <Bell className="size-5" aria-hidden="true" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary transition hover:bg-brand hover:text-white"
            aria-label={`${name}'s workspace`}
          >
            {name.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  )
}