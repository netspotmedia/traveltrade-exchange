import Link from 'next/link'
import { ArrowRight, BadgeCheck, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Honest early-marketplace state. Never fakes numbers — reflects that
 *  professionals are joining while keeping the page feeling alive. */
export function MarketplaceEmpty() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border-dashed glass-card px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Travel professionals are joining TTX
        </h3>
        <p className="mt-2 text-pretty leading-7 text-muted-foreground">
          Be among the first to discover verified travel services — with escrow-protected payments and clear agreements on every booking.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/marketplace">
          <Button size="lg">
            Explore services
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link href="/onboarding">
          <Button variant="outline" size="lg">
            Become a travel professional
          </Button>
        </Link>
      </div>
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <BadgeCheck className="size-3.5 text-secondary" aria-hidden="true" />
        Every professional completes business verification before listing.
      </p>
    </div>
  )
}