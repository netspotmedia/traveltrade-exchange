import Link from 'next/link'
import { Bell, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { key: 'security', href: '/settings/security', label: 'Security', icon: ShieldCheck },
  { key: 'notifications', href: '/settings/notifications', label: 'Notifications', icon: Bell },
]

export function SettingsNav({ active }: { active: 'security' | 'notifications' }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto" aria-label="Settings">
      {ITEMS.map(({ key, href, label, icon: Icon }) => {
        const isActive = active === key
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
              isActive
                ? 'border-primary/30 bg-brand-soft text-primary'
                : 'glass-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}