'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const POPULAR_SEARCHES = [
  { label: 'UK Visa', query: 'visa' },
  { label: 'Flights', query: 'flight' },
  { label: 'Hotels', query: 'hotel' },
  { label: 'Airport Transfer', query: 'transfer' },
  { label: 'Tours', query: 'tour' },
]

interface DashboardSearchProps {
  className?: string
}

/** Marketplace search hero — dominant search bar with popular suggestions.
 *  Immediately answers "What travel service do you need?" */
export function DashboardSearch({ className }: DashboardSearchProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/marketplace')
    }
  }

  function handlePopular(q: string) {
    router.push(`/marketplace?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border bg-white/90 px-5 py-4 shadow-lg shadow-primary/5 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            focused
              ? 'border-primary/40 shadow-xl shadow-primary/10 ring-2 ring-primary/10'
              : 'border-outline-variant/50 hover:border-primary/20 hover:shadow-xl',
          )}
        >
          <Search className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search visa assistance, flights, hotels, tours..."
            className="flex-1 bg-transparent text-base text-primary outline-none placeholder:text-on-surface-variant/50"
            aria-label="Search travel services"
          />
          <button
            type="submit"
            className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lg active:scale-[0.98] sm:inline-flex"
          >
            Search
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-outline-variant/40 bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant/60 sm:hidden">
          ⌘K
        </kbd>
      </form>

      {/* Popular searches */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
          <TrendingUp className="size-3" aria-hidden="true" />
          Popular
        </span>
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => handlePopular(item.query)}
            className="rounded-full border border-outline-variant/40 bg-white/60 px-3 py-1 text-xs font-semibold text-on-surface-variant transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
