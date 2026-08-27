import Link from 'next/link'
import { ArrowRight, Compass, Shield, Clock } from 'lucide-react'
import { FALLBACK_CATEGORIES } from '@/lib/categories'

interface DashboardEmptyStateProps {
  isSeller?: boolean
}

/** Activation-focused empty state for new users — replaces dead "No data"
 *  messages with guided next steps and popular service categories. */
export function DashboardEmptyState({ isSeller = false }: DashboardEmptyStateProps) {
  if (isSeller) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-outline-variant/60 bg-white/40 px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
          <Compass className="size-8" />
        </span>
        <div className="max-w-md">
          <h3 className="font-display text-xl font-bold tracking-tight text-primary">
            Your workspace is ready
          </h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Create your first travel service and start reaching customers looking for professional travel assistance.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/agent/services/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
          >
            Create your first service
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-6 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-secondary" aria-hidden="true" />
            Escrow protection included
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-secondary" aria-hidden="true" />
            Set your own availability
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-outline-variant/60 bg-white/40 px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
        <Compass className="size-8" />
      </span>
      <div className="max-w-md">
        <h3 className="font-display text-xl font-bold tracking-tight text-primary">
          Your travel workspace is ready
        </h3>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Find a trusted travel professional and start your first protected booking.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
        >
          Find a service
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-2">
        <p className="mb-2 text-xs font-semibold text-on-surface-variant">Popular travel services</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FALLBACK_CATEGORIES.slice(0, 5).map((cat) => (
            <Link
              key={cat}
              href={`/marketplace?q=${encodeURIComponent(cat)}`}
              className="rounded-full border border-outline-variant/40 bg-white/60 px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
