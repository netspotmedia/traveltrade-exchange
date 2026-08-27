import Link from 'next/link'
import { ShieldCheck, Star, Clock, MapPin } from 'lucide-react'
import { formatMoney, formatResponseTime, initials } from '@/lib/format'
import { categoryIcon } from '@/lib/categories'
import { cn } from '@/lib/utils'

type AgencyLike =
  | { name?: string | null; verification_status?: string | null; rating?: number | null; city?: string | null; slug?: string | null }
  | { name?: string | null; verification_status?: string | null; rating?: number | null; city?: string | null; slug?: string | null }[]
  | null

export interface PremiumServiceCardProps {
  service: {
    id: string
    title: string
    slug: string
    category: string
    description?: string | null
    location?: string | null
    base_price: number | string
    currency?: string | null
    ordering_mode?: string | null
    images?: string[] | null
    agencies?: AgencyLike
  }
  imageUrl?: string | null
  responseStats?: { avgResponseHours: number | null; responseRate: number | null } | null
  className?: string
}

/** Premium travel service card — designed for marketplace and recommendations.
 *  Features travel imagery, trust signals, and clear pricing. */
export function PremiumServiceCard({ service, imageUrl, responseStats, className }: PremiumServiceCardProps) {
  const agency = Array.isArray(service.agencies) ? service.agencies[0] : service.agencies
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'
  const responseTime = responseStats?.avgResponseHours ? formatResponseTime(responseStats.avgResponseHours) : null

  return (
    <Link
      href={`/marketplace/${service.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5',
        className,
      )}
    >
      {/* Image header */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/8 via-surface-container-low to-secondary/8">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={service.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="size-12 text-primary/20" />
          </div>
        )}

        {/* Verified badge */}
        {verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-secondary/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
            <ShieldCheck className="size-3.5" />
            Verified
          </span>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-snug tracking-tight text-primary line-clamp-2">
            {service.title}
          </h3>
          {rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-2 py-1">
              <Star className="size-3 fill-accent text-accent" />
              <span className="text-xs font-bold text-primary">{rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="mt-2 text-sm leading-5 text-on-surface-variant line-clamp-2">
            {service.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
          {agency?.name && (
            <span className="flex items-center gap-1">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
                {initials(agency.name)}
              </span>
              {agency.name}
            </span>
          )}
          {agency?.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {agency.city}
            </span>
          )}
          {responseTime && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {responseTime}
            </span>
          )}
        </div>

        {/* Footer: Price + CTA */}
        <div className="mt-auto flex items-end justify-between border-t border-outline-variant/20 pt-4">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">Starting at</span>
            <span className="text-lg font-bold text-primary">{formatMoney(service.base_price, service.currency)}</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
            View service
          </span>
        </div>
      </div>
    </Link>
  )
}
