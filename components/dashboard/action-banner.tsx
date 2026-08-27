'use client'

import Link from 'next/link'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import type { TradeRow } from '@/lib/dashboard'

interface ActionBannerProps {
  items: TradeRow[]
  viewAllHref: string
}

/** Urgent action banner — surfaces orders that need the user's attention
 *  with a clear CTA and context. Replaces the old "pending action" area. */
export function ActionBanner({ items, viewAllHref }: ActionBannerProps) {
  if (items.length === 0) return null

  const top = items[0]
  const remaining = items.length - 1

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent-soft via-background to-accent-soft p-5 md:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent" aria-hidden="true">
            <AlertCircle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">
              {items.length === 1 ? '1 item needs your attention' : `${items.length} items need your attention`}
            </p>
            <p className="mt-0.5 truncate text-sm text-on-surface-variant">
              {top.title} — {formatMoney(top.amount, top.currency)}
            </p>
            {remaining > 0 && (
              <p className="mt-0.5 text-xs text-on-surface-variant">
                +{remaining} more requiring action
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/orders/${top.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
          >
            Review now
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          {remaining > 0 && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              View all
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
