'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { mobileNavForRole, type NavRole } from '@/lib/nav'

/** Role-aware glass bottom navigation — mint active chip, unread badge on
 *  Messages. Mobile only. */
export function MobileNav({ role, unreadCount = 0 }: { role: NavRole; unreadCount?: number }) {
  const pathname = usePathname()
  const items = mobileNavForRole(role)

  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-white/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors', active ? 'text-primary' : 'text-on-surface-variant')}
            >
              <span className={cn('relative rounded-full px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors duration-200', active ? 'bg-primary-fixed/50' : '')}>
                <item.icon className="size-5" aria-hidden="true" />
                {item.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}