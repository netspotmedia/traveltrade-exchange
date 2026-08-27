import Link from 'next/link'
import { ChevronLeft, ChevronRight, Compass, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/service-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { MarketplaceControls, SORT_OPTIONS } from '@/components/marketplace/marketplace-controls'
import { formatNumber } from '@/lib/format'
import { publicImageUrl } from '@/lib/images'

const PAGE_SIZE = 12

type SearchParams = Promise<{ q?: string; category?: string; sort?: string; min?: string; max?: string; verified?: string; page?: string }>

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = (params.q ?? '').trim().replace(/[%_]/g, '')
  const category = (params.category ?? '').trim()
  const sort = (params.sort ?? 'recommended').trim()
  const min = Number(params.min)
  const max = Number(params.max)
  const verifiedOnly = params.verified === '1'
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let services: ServiceRow[] | null = null
  let count: number | null = null
  let categories: string[] = []
  const reviewCounts = new Map<string, number>()
  const statsMap = new Map<string, { avgResponseHours: number | null; responseRate: number | null }>()

  try {
    const supabase = await createClient()

    // Verified-agent filter is applied as an IN-list on agency_id (type-safe).
    let verifiedAgencyIds: string[] = []
    let noResults = false
    if (verifiedOnly) {
      const { data: vAgencies } = await supabase
        .from('agencies')
        .select('id')
        .eq('verification_status', 'verified')
        .is('deleted_at', null)
      verifiedAgencyIds = (vAgencies ?? []).map((a) => a.id)
      if (verifiedAgencyIds.length === 0) noResults = true
    }

    let query = supabase
      .from('services')
      .select('*, agencies(id, name, slug, verification_status, rating, city)', { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null)

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (category) query = query.eq('category', category)
    if (Number.isFinite(min) && min > 0) query = query.gte('base_price', min)
    if (Number.isFinite(max) && max > 0) query = query.lte('base_price', max)
    if (verifiedOnly && !noResults) query = query.in('agency_id', verifiedAgencyIds)

    const agencyIdOf = (s: ServiceRow) => {
      const a = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
      return a?.id ?? null
    }

    if (!noResults && sort === 'response_time') {
      // Fastest Response: fetch all matches, sort by real avg response time,
      // then paginate — keeps the sort correct across pages.
      const { data: all } = await query.order('created_at', { ascending: false })
      const rows = (all ?? []) as ServiceRow[]
      const ids = Array.from(new Set(rows.map(agencyIdOf).filter(Boolean) as string[]))
      if (ids.length > 0) {
        const { data: stats } = await supabase.rpc('agency_response_stats_batch', { p_agency_ids: ids })
        for (const row of (stats ?? []) as { agency_id: string; avg_response_hours: number | null; response_rate: number | null }[]) {
          statsMap.set(row.agency_id, { avgResponseHours: row.avg_response_hours, responseRate: row.response_rate })
        }
      }
      const sorted = rows.slice().sort((a, b) => {
        const ah = agencyIdOf(a) ? (statsMap.get(agencyIdOf(a)!)?.avgResponseHours ?? null) : null
        const bh = agencyIdOf(b) ? (statsMap.get(agencyIdOf(b)!)?.avgResponseHours ?? null) : null
        if (ah === null && bh === null) return 0
        if (ah === null) return 1
        if (bh === null) return -1
        return ah - bh
      })
      count = sorted.length
      services = sorted.slice(from, to + 1)
    } else if (!noResults) {
      switch (sort) {
        case 'rating':
          query = query.order('rating', { referencedTable: 'agencies', ascending: false })
          break
        case 'price_asc':
          query = query.order('base_price', { ascending: true })
          break
        case 'completed':
          query = query.order('completed_orders', { referencedTable: 'agencies', ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }
      const { data, count: c } = await query.range(from, to)
      services = (data ?? []) as ServiceRow[]
      count = c
      const ids = Array.from(new Set(services.map(agencyIdOf).filter(Boolean) as string[]))
      if (ids.length > 0) {
        const { data: stats } = await supabase.rpc('agency_response_stats_batch', { p_agency_ids: ids })
        for (const row of (stats ?? []) as { agency_id: string; avg_response_hours: number | null; response_rate: number | null }[]) {
          statsMap.set(row.agency_id, { avgResponseHours: row.avg_response_hours, responseRate: row.response_rate })
        }
      }
    }

    const categoryRes = noResults ? null : await supabase.from('services').select('category').eq('status', 'published').is('deleted_at', null)
    categories = Array.from(new Set((categoryRes?.data ?? []).map((c) => c.category as string).filter(Boolean)))

    // Review counts for the services on this page (one batched query).
    const pageIds = (services ?? []).map((s: ServiceRow) => s.id)
    if (pageIds.length > 0) {
      const { data: reviewRows } = await supabase.from('reviews').select('service_id').in('service_id', pageIds).is('deleted_at', null)
      for (const r of (reviewRows ?? []) as { service_id: string }[]) {
        if (!r.service_id) continue
        reviewCounts.set(r.service_id, (reviewCounts.get(r.service_id) ?? 0) + 1)
      }
    }
  } catch {
    // Supabase unavailable — show empty state
    services = []
    count = 0
  }

  const total = services === null ? 0 : (count ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Recommended'

  const controls = { q, category, sort, minPrice: Number.isFinite(min) && min > 0 ? String(min) : '', maxPrice: Number.isFinite(max) && max > 0 ? String(max) : '', verifiedOnly }

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-10 md:pt-10 lg:pb-12">
        {/* Page header */}
        <Reveal>
          <div className="mb-12 relative max-w-2xl">
            <div className="pointer-events-none absolute -inset-x-10 -top-24 -z-10 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,var(--brand-soft),transparent)]" aria-hidden="true" />
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-primary text-balance sm:text-5xl md:text-display-lg">
              Find the right partner for the journey
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-lg text-on-surface-variant">
              Compare verified travel services, then move into a protected agreement.
            </p>
          </div>
        </Reveal>

        {/* Filter bar */}
        <div className="glass-panel rounded-2xl border border-border p-4 mb-12 shadow-lg shadow-primary-container/20">
          <MarketplaceControls initial={controls} categories={categories} />
        </div>

        {/* Results */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-on-surface-variant">
            <strong className="font-semibold text-primary">{formatNumber(total)}</strong> travel services found
            {sort !== 'recommended' && <span className="ml-1">· sorted by {sortLabel.toLowerCase()}</span>}
          </p>
        </div>

        {/* Grid */}
        {!services || services.length === 0 ? (
          <EmptyState
            icon={total > 0 ? Search : Compass}
            title={q || category || min > 0 || max > 0 || verifiedOnly ? 'No services match your search' : 'No services yet'}
            description={
              q || category || min > 0 || max > 0 || verifiedOnly
                ? 'Try adjusting your search or clearing some filters.'
                : 'We are onboarding our first verified travel agents. Check back soon.'
            }
            action={
              q || category || min > 0 || max > 0 || verifiedOnly ? (
                <Link href="/marketplace">
                  <Button variant="outline">Clear filters</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(services as ServiceRow[]).map((s) => {
              const agency = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
              return (
                <ServiceCard
                  key={s.id}
                  service={{ ...s, agencies: agency as ServiceRow['agencies'] }}
                  responseStats={agency?.id ? (statsMap.get(agency.id) ?? null) : null}
                  imageUrl={s.images?.[0] ? publicImageUrl(s.images[0]) : null}
                  reviewCount={reviewCounts.get(s.id) ?? null}
                />
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
            {currentPage > 1 ? (
              <Link
                href={`/marketplace?${paramsToQs(params, currentPage - 1)}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl glass-card px-4 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
              >
                <ChevronLeft className="size-4" /> Previous
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">
                <ChevronLeft className="size-4" /> Previous
              </span>
            )}
            <span className="text-sm text-muted-foreground" aria-current="page">
              Page <strong className="text-foreground">{currentPage}</strong> of {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={`/marketplace?${paramsToQs(params, currentPage + 1)}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl glass-card px-4 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
              >
                Next <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">
                Next <ChevronRight className="size-4" />
              </span>
            )}
          </nav>
        )}
      </main>
    </div>
  )
}

type ServiceRow = {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  location: string | null
  base_price: number
  currency: string
  ordering_mode: string | null
  images?: string[] | null
  agencies:
    | { id: string; name: string; slug: string; verification_status: string; rating: number; city: string | null }
    | { id: string; name: string; slug: string; verification_status: string; rating: number; city: string | null }[]
    | null
}

function paramsToQs(params: { q?: string; category?: string; sort?: string; min?: string; max?: string; verified?: string; page?: string }, page: number): string {
  const p = new URLSearchParams()
  if (params.q) p.set('q', params.q)
  if (params.category) p.set('category', params.category)
  if (params.sort && params.sort !== 'recommended') p.set('sort', params.sort)
  if (params.min) p.set('min', params.min)
  if (params.max) p.set('max', params.max)
  if (params.verified) p.set('verified', params.verified)
  if (page > 1) p.set('page', String(page))
  return p.toString()
}
