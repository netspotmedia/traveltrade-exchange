import Link from 'next/link'
import { ArrowRight, Compass, Lock, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroParallax } from '@/components/home/hero-parallax'
import { formatMoney } from '@/lib/format'
import { categoryIcon } from '@/lib/categories'
import { cn } from '@/lib/utils'

export interface HeroService {
  id: string
  title: string
  slug: string
  category: string
  base_price: number
  currency: string | null
  imageUrl?: string | null
  agency?: { name?: string | null; verification_status?: string | null; rating?: number | null } | null
}

interface HeroMarketplaceProps {
  /** Real, published services (first two are featured). Empty = early-market state. */
  services: HeroService[]
}

/** Marketplace visual layer — an honest, living preview of the marketplace.
 *  Uses real published services when available; otherwise renders clearly-
 *  abstracted UI previews (never fake live statistics). */
export function HeroMarketplace({ services }: HeroMarketplaceProps) {
  const [featured, second] = services

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Ambient brand fields behind the stage */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute right-[-8%] top-[-6%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(14_124_102/0.12),transparent)]" />
        <div className="absolute bottom-[-12%] left-[6%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(232_163_61/0.10),transparent)]" />
      </div>

      <HeroParallax delay={180} speed={0.05}>
        <div className="relative flex min-h-[24rem] flex-col items-center justify-center py-6 lg:min-h-[30rem]">
          {featured ? (
            <>
              <ServiceCard service={featured} className="animate-float z-10 -rotate-1" />
              {second && (
                <ServiceCard
                  service={second}
                  className="animate-float-delayed z-20 -mt-14 ml-6 rotate-2 sm:ml-12"
                />
              )}
              <PaymentBadge className="z-30 -mt-6 -rotate-2 sm:-ml-24" />
            </>
          ) : (
            <EarlyMarketplace />
          )}
        </div>
      </HeroParallax>
    </div>
  )
}

function ServiceCard({ service, className }: { service: HeroService; className?: string }) {
  const Icon = categoryIcon(service.category)
  const rating = Number(service.agency?.rating ?? 0)
  const verified = service.agency?.verification_status === 'verified'

  return (
    <Link
      href={`/marketplace/${service.slug}`}
      className={cn(
        'group w-[17rem] rounded-2xl border border-border bg-card p-5 text-left shadow-soft-lg transition-shadow duration-300 hover:shadow-float sm:w-[18.5rem]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/70 px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Verified
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-1 text-sm font-semibold tracking-tight text-foreground">{service.title}</h3>

      {rating > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
          <span className="text-muted-foreground/70">{service.agency?.name ? `· ${service.agency.name}` : ''}</span>
        </p>
      )}

      <div className="mt-3 flex items-end justify-between border-t border-border/70 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">From</p>
          <p className="font-mono text-base font-semibold tracking-tight text-foreground">
            {formatMoney(service.base_price, service.currency)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          View
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

/** Product-level guarantee, never a fabricated statistic. */
function PaymentBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-soft-lg',
        className,
      )}
    >
      <Lock className="size-3.5 text-secondary" aria-hidden="true" />
      Payment protected
    </span>
  )
}

/** Early-marketplace state — communicates the concept without pretending
 *  real services exist. Abstracted UI previews only. */
function EarlyMarketplace() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative flex flex-col items-center">
        <div className="animate-float flex w-56 flex-col gap-3 rounded-2xl border border-dashed border-border bg-card/70 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <Compass className="size-4" aria-hidden="true" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/70 px-2 py-0.5 text-[10px] font-semibold text-success-foreground">
              <ShieldCheck className="size-3" aria-hidden="true" /> Verified
            </span>
          </div>
          <div className="h-2.5 w-3/4 rounded-full bg-muted" />
          <div className="h-2 w-1/2 rounded-full bg-muted" />
          <div className="mt-1 flex items-center justify-between">
            <div className="h-3 w-16 rounded-full bg-muted" />
            <span className="h-6 w-14 rounded-full bg-brand-soft" />
          </div>
        </div>
        <div className="animate-float-delayed -mt-8 ml-8 flex w-48 flex-col gap-2.5 rounded-2xl border border-dashed border-border bg-card/70 p-4 shadow-soft">
          <div className="h-2.5 w-2/3 rounded-full bg-muted" />
          <div className="h-2 w-1/3 rounded-full bg-muted" />
        </div>
      </div>

      <div className="max-w-sm text-center">
        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
          Travel professionals are joining TTX
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Be among the first to discover verified travel services with protected payments.
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
    </div>
  )
}