'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LayoutGrid, Search, ShoppingBag, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutGrid },
  { href: '/marketplace', label: 'Find', icon: Search },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/dashboard/notifications', label: 'Alerts', icon: Bell },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}