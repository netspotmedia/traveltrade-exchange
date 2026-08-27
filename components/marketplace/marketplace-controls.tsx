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
  const [filtersOpen, setFiltersOpen] = useState(true)
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
    <div className="flex flex-col gap-6">
      {/* Main filter row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline" />
          <label htmlFor="marketplace-search" className="sr-only">
            Search travel services
          </label>
          <input
            id="marketplace-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations, services, or agents…"
            className="w-full h-12 pl-12 pr-10 rounded-lg border-b border-outline-variant bg-surface-container-lowest/50 focus:bg-surface-container-lowest focus:border-primary focus:ring-0 transition-colors text-on-surface placeholder:text-outline outline-none"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-outline transition hover:bg-surface-container hover:text-primary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category */}
        <div className="relative min-w-[200px]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-12 appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest/50 pl-4 pr-10 text-sm font-semibold text-on-surface focus:border-primary focus:ring-0 transition-colors cursor-pointer outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-outline" />
        </div>

        {/* Sort */}
        <div className="relative min-w-[200px]">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full h-12 appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest/50 pl-4 pr-10 text-sm font-semibold text-on-surface focus:border-primary focus:ring-0 transition-colors cursor-pointer outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-outline" />
        </div>

        {/* Filters toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="marketplace-filters"
          className={cn(
            'h-12 px-6 rounded-lg border border-outline-variant bg-surface-container-lowest/50 font-semibold text-sm flex items-center gap-2 transition-colors hover:bg-surface-container',
            filtersOpen && 'border-primary/40 text-primary bg-surface-container',
          )}
        >
          <SlidersHorizontal className="size-5" />
          Filters
        </button>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div id="marketplace-filters" className="flex flex-wrap gap-6 items-end pt-4 border-t border-outline-variant/30">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Min Price (USD)</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-32 h-10 rounded-md border-b border-outline-variant bg-surface-container-lowest/50 focus:border-primary focus:ring-0 px-3 text-on-surface outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Max Price (USD)</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              className="w-32 h-10 rounded-md border-b border-outline-variant bg-surface-container-lowest/50 focus:border-primary focus:ring-0 px-3 text-on-surface outline-none"
            />
          </label>
          <label className="flex items-center gap-3 h-10 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="size-5 rounded border-outline-variant text-primary accent-primary"
            />
            <span className="text-sm font-semibold text-on-surface">Verified Agents Only</span>
          </label>
          <div className="flex-grow flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-outline hover:text-error transition-colors"
            >
              Clear all
            </button>
          </div>
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
