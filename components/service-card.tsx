import Link from 'next/link'
import { ShieldCheck, Star } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { categoryIcon } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

type AgencyLike =
  | { name?: string | null; verification_status?: string | null; rating?: number | null; city?: string | null }
  | { name?: string | null; verification_status?: string | null; rating?: number | null; city?: string | null }[]
  | null

export interface ServiceCardProps {
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
  responseStats?: { avgResponseHours: number | null; responseRate: number | null } | null
  imageUrl?: string | null
  reviewCount?: number | null
  className?: string
}

export function ServiceCard({ service, imageUrl, className }: ServiceCardProps) {
  const agency = Array.isArray(service.agencies) ? service.agencies[0] : service.agencies
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'
  const instant = service.ordering_mode === 'instant_order'

  return (
    <Link
      href={`/marketplace/${service.slug}`}
      className={cn(
        'glass-panel group flex flex-col overflow-hidden rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,53,39,0.1)] hover:backdrop-blur-[32px]',
        className,
      )}
    >
      {/* Image header */}
      <div className="relative h-48 w-full overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={service.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 via-primary-fixed to-secondary-fixed">
            <Icon className="size-10 text-primary/40" />
          </div>
        )}
        {/* Badge overlay */}
        {verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded bg-secondary-container px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-on-secondary-container shadow-sm">
            <ShieldCheck className="size-3.5" />
            Verified
          </span>
        )}
        {!verified && instant && (
          <span className="absolute right-3 top-3 rounded bg-surface-container-lowest px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-on-surface shadow-sm border border-outline-variant/50">
            Pro
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title + rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-primary line-clamp-1">
            {service.title}
          </h3>
          {rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-container-highest px-2 py-1 text-sm">
              <Star className="size-3.5 fill-secondary text-secondary" />
              <span className="font-bold text-primary">{rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <p className="mb-4 text-sm leading-6 text-on-surface-variant line-clamp-2">
            {service.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-outline-variant/30 pt-4">
          <div className="flex items-center gap-2">
            {agency?.name ? (
              <>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-container text-[10px] font-bold text-on-primary-container">
                  {initials(agency.name)}
                </span>
                <span className="text-sm font-medium text-primary">{agency.name}</span>
              </>
            ) : (
              <span className="text-sm text-on-surface-variant">Travel professional</span>
            )}
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-outline">Starting at</span>
            <span className="text-sm font-bold text-primary">{formatMoney(service.base_price, service.currency)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
