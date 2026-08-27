'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { mobileNavForRole, type NavRole } from '@/lib/nav'

/** Role-aware glass bottom navigation — active chip indicator, unread badge,
 *  and improved mobile touch targets. Mobile only. */
export function MobileNav({ role, unreadCount = 0 }: { role: NavRole; unreadCount?: number }) {
  const pathname = usePathname()
  const items = mobileNavForRole(role)

  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-all duration-200',
                active ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              <span
                className={cn(
                  'relative rounded-2xl px-3 py-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  active
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                    : 'text-on-surface-variant',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white notif-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={cn('transition-colors duration-200', active && 'font-bold')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
