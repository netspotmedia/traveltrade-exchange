import Link from 'next/link'
import { Bell, Globe, HelpCircle, Menu } from 'lucide-react'
import { NavDrawer } from '@/components/layout/nav-drawer'

interface MobileHeaderProps {
  name: string
  unreadNotifications: number
  /** Drawer content (nav, CTA, profile, sign out) — rendered on the server. */
  menu: React.ReactNode
}

/** Mobile-only glass top bar — menu drawer, brand, notifications, help and
 *  profile. Hidden on lg where the docked sidebar takes over. */
export function MobileHeader({ name, unreadNotifications, menu }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-white/20 bg-white/60 px-4 backdrop-blur-3xl lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <NavDrawer label={<Menu className="size-5" aria-hidden="true" />}>{menu}</NavDrawer>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="TravelTrade dashboard">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-on-primary" aria-hidden="true">
            <Globe className="size-4" />
          </span>
          <span className="truncate font-display text-lg font-bold tracking-tight text-primary">TravelTrade</span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/notifications"
          aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
          className="relative grid size-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadNotifications > 0 && (
            <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>
        <Link
          href="/help"
          aria-label="Help centre"
          className="grid size-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
        >
          <HelpCircle className="size-5" aria-hidden="true" />
        </Link>
        <Link
          href="/dashboard"
          aria-label={`${name}'s workspace`}
          className="ml-1 grid size-9 place-items-center rounded-full bg-primary-fixed text-sm font-bold text-primary transition-colors hover:brightness-95"
        >
          {name.charAt(0).toUpperCase()}
        </Link>
      </div>
    </header>
  )
}