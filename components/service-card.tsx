import Link from 'next/link'
import {
  ArrowRight,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatMoney, formatResponseTime } from '@/lib/format'
import { categoryIcon } from '@/lib/categories'
import { cn } from '@/lib/utils'

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
  // Real computed response metrics (from agency_response_stats_batch).
  responseStats?: { avgResponseHours: number | null; responseRate: number | null } | null
  imageUrl?: string | null
  reviewCount?: number | null
  className?: string
}

export function ServiceCard({ service, responseStats, imageUrl, reviewCount, className }: ServiceCardProps) {
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
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-input/70 hover:shadow-soft-lg focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      {/* Visual header — service image when available, else honest category tile */}
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-brand/12 via-brand-soft to-secondary">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={service.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-2xl bg-card text-brand shadow-card transition-transform duration-300 group-hover:scale-105" aria-hidden="true">
            <Icon className="size-7" />
          </span>
        )}
        <span className="absolute left-3 top-3">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {service.category}
          </Badge>
        </span>
        {instant && (
          <span className="absolute right-3 top-3">
            <Badge variant="brand" className="bg-primary text-primary-foreground">
              Instant order
            </Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">{service.title}</h3>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-success-foreground">
                <ShieldCheck className="size-3.5" /> {agency?.name || 'Verified agent'}
              </span>
            ) : (
              <span className="truncate">{agency?.name || 'Travel professional'}</span>
            )}
          </div>
        </div>

        {service.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{service.description}</p>}

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {rating > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
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
          {responseLabel && (
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {responseLabel}
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between border-t border-border/70 pt-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Starting from</p>
            <p className="font-mono text-lg font-semibold tracking-tight text-foreground">{formatMoney(service.base_price, service.currency)}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-medium text-brand transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-brand group-hover:text-primary-foreground">
            View
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}