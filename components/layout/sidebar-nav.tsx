'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { appNav, isNavActive, type NavRole } from '@/lib/nav'
import { cn } from '@/lib/utils'

/** Role-aware sidebar navigation — glass pills with a gold active state. */
export function SidebarNav({ role }: { role: NavRole }) {
  const pathname = usePathname()
  const visible = appNav.filter((item) => !item.roles || item.roles.includes(role))

  if (visible.length === 0) return null

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Sidebar">
      {visible.map((item) => {
        const active = isNavActive(item, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              active
                ? 'bg-secondary-container text-on-secondary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
                : 'text-on-surface-variant hover:bg-white/10 hover:text-primary hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
            )}
          >
            <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
            {item.label}
            {active && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-on-secondary-container/40" />}
          </Link>
        )
      })}
    </nav>
  )
}