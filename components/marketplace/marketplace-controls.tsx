'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'response_time', label: 'Fastest Response' },
  { value: 'completed', label: 'Most Completed' },
]

export interface ControlsState {
  q: string
  category: string
  sort: string
  minPrice: string
  maxPrice: string
  verifiedOnly: boolean
}

export function MarketplaceControls({
  initial,
  categories,
}: {
  initial: ControlsState
  categories: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initial.q)
  const [category, setCategory] = useState(initial.category)
  const [sort, setSort] = useState(initial.sort)
  const [minPrice, setMinPrice] = useState(initial.minPrice)
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice)
  const [verifiedOnly, setVerifiedOnly] = useState(initial.verifiedOnly)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Skip the commit effects on first render so deep-linked URLs (including
  // the page param) are preserved on initial load.
  const mountedRef = useRef(false)

  function commit(partial: Partial<ControlsState>) {
    const params = new URLSearchParams()
    const next = {
      q,
      category,
      sort,
      minPrice,
      maxPrice,
      verifiedOnly,
      ...partial,
    }
    if (next.q.trim()) params.set('q', next.q.trim())
    if (next.category) params.set('category', next.category)
    if (next.sort && next.sort !== 'recommended') params.set('sort', next.sort)
    if (next.minPrice) params.set('min', next.minPrice)
    if (next.maxPrice) params.set('max', next.maxPrice)
    if (next.verifiedOnly) params.set('verified', '1')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Debounced search so results follow keystrokes without hammering the server.
  useEffect(() => {
    if (!mountedRef.current) return
    const t = setTimeout(() => {
      commit({ q })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    if (!mountedRef.current) return
    commit({ category })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    if (!mountedRef.current) return
    commit({ sort })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  useEffect(() => {
    if (!mountedRef.current) return
    const t = setTimeout(() => commit({ minPrice, maxPrice }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice])

  useEffect(() => {
    mountedRef.current = true
  }, [])

  // Close the mobile filter sheet with Escape.
  useEffect(() => {
    if (!filtersOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  function clearFilters() {
    setQ('')
    setCategory('')
    setSort('recommended')
    setMinPrice('')
    setMaxPrice('')
    setVerifiedOnly(false)
    router.replace(pathname, { scroll: false })
  }

  const hasFilters = Boolean(q || category || minPrice || maxPrice || verifiedOnly || sort !== 'recommended')
  const filterCount = [minPrice, maxPrice, verifiedOnly ? '1' : ''].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="marketplace-search" className="sr-only">
          Search travel services
        </label>
        <Input
          id="marketplace-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search destinations, services, or agents…"
          className="h-12 pl-11 pr-10"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 appearance-none rounded-xl border border-border bg-card pl-3.5 pr-9 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
        </label>

        <label className="relative inline-flex items-center">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 appearance-none rounded-xl border border-border bg-card pl-3.5 pr-9 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
        </label>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="marketplace-filters"
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-medium transition hover:bg-muted',
            filtersOpen && 'border-primary/40 text-primary',
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {filterCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {filterCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:text-destructive"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters — inline on desktop */}
      {filtersOpen && (
        <div id="marketplace-filters" className="hidden flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4 sm:flex">
          <PriceInputs minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly} />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {filtersOpen && (
        <div className="sm:hidden">
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-6 shadow-float pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-[sheet-up_220ms_ease-out]"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              {filterCount > 0 && (
                <button type="button" onClick={clearFilters} className="text-sm font-medium text-muted-foreground transition hover:text-destructive">
                  Clear all
                </button>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-5">
              <PriceInputs minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly} stack />
            </div>
            <Button className="mt-6 w-full h-12 text-base" onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceInputs({
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  verifiedOnly,
  setVerifiedOnly,
  stack,
}: {
  minPrice: string
  setMinPrice: (v: string) => void
  maxPrice: string
  setMaxPrice: (v: string) => void
  verifiedOnly: boolean
  setVerifiedOnly: (v: boolean) => void
  stack?: boolean
}) {
  return (
    <>
      <label className={cn('flex flex-col gap-1.5 text-xs font-medium text-muted-foreground', stack && 'flex-1')}>
        Minimum price (₦)
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Any"
          className={cn('h-10', stack ? 'w-full' : 'w-36')}
        />
      </label>
      <label className={cn('flex flex-col gap-1.5 text-xs font-medium text-muted-foreground', stack && 'flex-1')}>
        Maximum price (₦)
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Any"
          className={cn('h-10', stack ? 'w-full' : 'w-36')}
        />
      </label>
      <label className={cn('flex h-10 cursor-pointer items-center gap-2 text-sm font-medium', stack && 'h-12')}>
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
          className="size-4 accent-[var(--brand)]"
        />
        Verified agents only
      </label>
    </>
  )
}