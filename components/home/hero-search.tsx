"use client"

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { track } from '@vercel/analytics'
import { Button } from '@/components/ui/button'

const EXAMPLES = ['UK visa assistance', 'Flight ticket to London', 'Airport transfer', 'Dubai hotel booking']

// The conversion point of the homepage: a search that funnels into the
// marketplace. Fires A/B events so we can measure which hero converts.
export function HeroSearch({ variant }: { variant: 'a' | 'b' }) {
  const [query, setQuery] = useState('')

  function submit() {
    track('hero_search', { variant, q: query.trim() })
  }

  return (
    <div>
      <form
        action="/marketplace"
        method="get"
        onSubmit={submit}
        className="group relative mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full glass-card p-1.5 pl-5 shadow-soft-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-soft focus-within:border-primary/40 focus-within:shadow-soft focus-within:ring-4 focus-within:ring-primary/10"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-transform duration-300 group-focus-within:scale-105">
          <Search className="size-4" aria-hidden="true" />
        </span>
        <label htmlFor="hero-search" className="sr-only">
          What travel service do you need?
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          autoComplete="off"
          placeholder="What travel service do you need?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <Button type="submit" variant="accent" size="lg" className="shrink-0">
          {variant === 'b' ? 'Find my specialist' : 'Search'}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5" aria-hidden="true" />
        </Button>
      </form>

      {/* Popular searches — horizontal scroll on mobile, wrapped on desktop */}
      <div className="mt-5 flex items-center gap-3">
        <span className="font-eyebrow hidden shrink-0 text-muted-foreground/70 sm:inline">Popular</span>
        <ul
          aria-label="Popular travel searches"
          className="scrollbar-none -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
        >
          {EXAMPLES.map((ex) => (
            <li key={ex} className="shrink-0 snap-start">
              <Link
                href={`/marketplace?q=${encodeURIComponent(ex)}`}
                onClick={() => track('hero_search_chip', { variant, q: ex })}
                className="group/chip inline-flex items-center gap-1.5 rounded-full glass-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-soft"
              >
                {ex}
                <ArrowRight className="size-3 -translate-x-0.5 text-muted-foreground opacity-0 transition-all duration-200 group-hover/chip:translate-x-0 group-hover/chip:opacity-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}