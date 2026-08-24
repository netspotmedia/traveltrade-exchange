import Link from 'next/link'
import {
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/format'
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
    agencies?: AgencyLike
  }
  className?: string
}

export function ServiceCard({ service, className }: ServiceCardProps) {
  const agency = Array.isArray(service.agencies) ? service.agencies[0] : service.agencies
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'
  const instant = service.ordering_mode === 'instant_order'
  const location = service.location || agency?.city || null

  return (
    <Link
      href={`/marketplace/${service.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      {/* Visual header — honest gradient + category icon (services have no photos yet) */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-brand/12 via-brand-soft to-secondary" aria-hidden="true">
        <span className="grid size-14 place-items-center rounded-2xl bg-card text-brand shadow-card transition-transform duration-200 group-hover:scale-105">
          <Icon className="size-7" />
        </span>
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

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{service.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            {verified ? (
              <Badge variant="success" className="gap-1 px-1.5 py-0 text-[11px]">
                <ShieldCheck className="size-3" /> Verified agent
              </Badge>
            ) : (
              <span>{agency?.name || 'Travel professional'}</span>
            )}
            {verified && agency?.name && <span className="truncate">· {agency.name}</span>}
          </div>
        </div>

        {service.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{service.description}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {rating > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {location}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Starting from</p>
            <p className="font-mono text-lg font-semibold text-foreground">{formatMoney(service.base_price, service.currency)}</p>
          </div>
          <span className="rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand transition-colors group-hover:bg-brand group-hover:text-primary-foreground">
            View service
          </span>
        </div>
      </div>
    </Link>
  )
}