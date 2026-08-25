'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { appNav, isNavActive, type NavRole } from '@/lib/nav'
import { cn } from '@/lib/utils'

/** Role-aware sidebar navigation with client-side active state. */
export function SidebarNav({ role }: { role: NavRole }) {
  const pathname = usePathname()
  const visible = appNav.filter((item) => !item.roles || item.roles.includes(role))

  if (visible.length === 0) return null

  return (
    <nav className="space-y-1" aria-label="Sidebar">
      {visible.map((item) => {
        const active = isNavActive(item, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}