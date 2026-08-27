import Link from 'next/link'
import { ShoppingBag, MessageSquareText, WalletCards, ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/format'

interface ActivitySummaryProps {
  activeOrders: number
  unreadMessages: number
  escrowTotal: number
  currency: string
}

/** Compact activity summary — gives the user an at-a-glance understanding
 *  of what's happening across the platform. Replaces the old KPI grid. */
export function ActivitySummary({ activeOrders, unreadMessages, escrowTotal, currency }: ActivitySummaryProps) {
  const items = [
    {
      icon: ShoppingBag,
      href: '/orders',
      value: activeOrders,
      label: 'Active order',
      plural: 'Active orders',
      accent: 'bg-primary/10 text-primary',
    },
    {
      icon: MessageSquareText,
      href: '/messages',
      value: unreadMessages,
      label: 'Message',
      plural: 'Messages',
      accent: 'bg-secondary/10 text-secondary',
    },
    {
      icon: WalletCards,
      href: '/dashboard/wallet',
      value: escrowTotal,
      label: 'Protected',
      plural: 'Protected',
      isMoney: true,
      accent: 'bg-accent/10 text-accent',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        const val = item.isMoney ? formatMoney(item.value, currency) : String(item.value)
        const label = item.value === 1 ? item.label : item.plural

        return (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]"
          >
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.accent}`} aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold tracking-tight text-primary">{val}</p>
              <p className="text-xs font-medium text-on-surface-variant">{label}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-on-surface-variant/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
          </Link>
        )
      })}
    </div>
  )
}
