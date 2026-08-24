'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'newest', label: 'Newest' },
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
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-medium transition hover:bg-muted',
            filtersOpen && 'border-primary/40 text-primary',
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
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

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Minimum price (₦)
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Any"
              className="h-10 w-36"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Maximum price (₦)
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              className="h-10 w-36"
            />
          </label>
          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Verified agents only
          </label>
        </div>
      )}
    </div>
  )
}