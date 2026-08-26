import Link from 'next/link'
import { ArrowRight, MapPin, ShieldCheck, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatMoney, formatResponseTime } from '@/lib/format'
import { categoryIcon } from '@/lib/categories'
import type { ServiceCardProps } from '@/components/service-card'

/** Horizontal spotlight card for the first item in a service grid. Same data
 *  contract as ServiceCard — this is a layout variant, not a different data
 *  source — so it stays honest (real image, real rating, real price) while
 *  giving the section one deliberate focal point instead of N equal tiles. */
export function FeaturedServiceCard({ service, responseStats, imageUrl, reviewCount, className }: ServiceCardProps) {
  const agency = Array.isArray(service.agencies) ? service.agencies[0] : service.agencies
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'
  const instant = service.ordering_mode === 'instant_order'
  const location = service.location || agency?.city || null
  const responseLabel = formatResponseTime(responseStats?.avgResponseHours ?? null)

  return (
    <Link
      href={`/marketplace/${service.slug}`}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-input/70 hover:shadow-soft-lg focus-visible:ring-2 focus-visible:ring-ring/50 md:flex-row ${className ?? ''}`}
    >
      {/* Larger visual — roughly half the card on desktop, full-bleed top on mobile */}
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-gradient-to-br from-brand/12 via-brand-soft to-secondary md:aspect-auto md:w-[45%]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={service.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="grid size-16 place-items-center rounded-2xl bg-card text-brand shadow-card transition-transform duration-300 group-hover:scale-105">
              <Icon className="size-8" />
            </span>
          </span>
        )}
        <span className="absolute left-4 top-4">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {service.category}
          </Badge>
        </span>
        {instant && (
          <span className="absolute right-4 top-4">
            <Badge variant="brand" className="bg-primary text-primary-foreground">
              Instant order
            </Badge>
          </span>
        )}
      </div>

      {/* Content — more room to breathe than the grid cards */}
      <div className="flex flex-1 flex-col justify-between gap-6 p-7 md:p-8">
        <div>
          <span className="font-eyebrow text-primary">Featured this week</span>
          <h3 className="font-display mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground">
            {service.title}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-success-foreground">
                <ShieldCheck className="size-3.5" /> {agency?.name || 'Verified agent'}
              </span>
            ) : (
              <span className="truncate">{agency?.name || 'Travel professional'}</span>
            )}
          </div>
          {service.description && (
            <p className="mt-3 line-clamp-2 max-w-md text-sm leading-6 text-muted-foreground">{service.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {rating > 0 && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="size-4 fill-accent text-accent" />
                {rating.toFixed(1)}
                {reviewCount ? <span className="font-normal text-muted-foreground">({reviewCount})</span> : null}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {location}
              </span>
            )}
            {responseLabel && <span>{responseLabel}</span>}
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-border/70 pt-5">
          <div>
            <p className="text-[11px] text-muted-foreground">Starting from</p>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {formatMoney(service.base_price, service.currency)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-90">
            View service
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
