import Link from 'next/link'
import { ArrowRight, Inbox, Store, WalletCards } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import type { LucideIcon } from 'lucide-react'

interface SellerTasksProps {
  pendingRequests: number
  draftServices: number
  availableBalance: number
  currency: string
}

interface TaskItem {
  href: string
  icon: LucideIcon
  title: string
  value: string
  hint: string
  accent: string
}

/** Agent task dashboard section — surfaces the most important actions
 *  a seller needs to take, with clear values and next-step hints. */
export function SellerTasks({ pendingRequests, draftServices, availableBalance, currency }: SellerTasksProps) {
  const tasks: TaskItem[] = [
    {
      href: '/agent/requests',
      icon: Inbox,
      title: 'Quote requests',
      value: String(pendingRequests),
      hint: pendingRequests > 0 ? 'Customers are waiting for your proposal' : 'No open requests',
      accent: 'bg-accent/10 text-accent',
    },
    {
      href: '/agent/services',
      icon: Store,
      title: 'Services in review',
      value: String(draftServices),
      hint: draftServices > 0 ? `${draftServices} draft or pending` : 'All services live',
      accent: 'bg-secondary/10 text-secondary',
    },
    {
      href: '/agent/withdrawals',
      icon: WalletCards,
      title: 'Available balance',
      value: Number(availableBalance) > 0 ? formatMoney(availableBalance, currency) : '—',
      hint: 'Move earnings to your bank',
      accent: 'bg-primary/10 text-primary',
    },
  ]

  return (
    <section aria-label="Your tasks">
      <h2 className="font-display text-lg font-bold tracking-tight text-primary">Your tasks</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tasks.map((task) => {
          const Icon = task.icon
          return (
            <Link
              key={task.href}
              href={task.href}
              className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${task.accent}`} aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold tracking-tight text-primary">{task.value}</p>
                <p className="text-xs font-semibold text-primary">{task.title}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{task.hint}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-on-surface-variant/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
