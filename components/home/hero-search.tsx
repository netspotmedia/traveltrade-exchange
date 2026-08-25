"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
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
        className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-soft-lg transition-shadow focus-within:shadow-soft"
      >
        <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
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
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
        />
        <Button type="submit" size="lg" className="shrink-0">
          {variant === 'b' ? 'Find my specialist' : 'Search'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="font-eyebrow text-muted-foreground/70">Popular:</span>
        {EXAMPLES.map((ex) => (
          <Link
            key={ex}
            href={`/marketplace?q=${encodeURIComponent(ex)}`}
            onClick={() => track('hero_search_chip', { variant, q: ex })}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {ex}
          </Link>
        ))}
      </div>
    </div>
  )
}