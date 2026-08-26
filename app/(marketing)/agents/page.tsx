import Link from 'next/link'
import type { Metadata } from 'next'
import { BadgeCheck, MapPin, Star, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Verified Agents',
  description:
    'Browse verified travel agencies on TravelTrade Exchange — trusted professionals you can work with on protected payments.',
}

const PER_PAGE = 24

type AgencyRow = {
  id: string
  name: string
  slug: string
  country: string
  city: string | null
  rating: number
  completed_orders: number
}

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ country?: string; page?: string }> }) {
  const params = await searchParams
  const country = (params.country ?? '').trim()
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PER_PAGE

  const supabase = await createClient()

  // Available countries for the filter (from verified agencies).
  const { data: countriesData } = await supabase
    .from('agencies')
    .select('country')
    .eq('verification_status', 'verified')
    .is('deleted_at', null)
  const countries = Array.from(new Set((countriesData ?? []).map((c) => (c.country as string) ?? 'Nigeria').filter(Boolean))).sort()

  let query = supabase
    .from('agencies')
    .select('id, name, slug, country, city, rating, completed_orders', { count: 'exact' })
    .eq('verification_status', 'verified')
    .is('deleted_at', null)
  if (country) query = query.eq('country', country)
  const { data: agencies, count } = await query.order('rating', { ascending: false }).range(skip, skip + PER_PAGE - 1)

  const list = (agencies ?? []) as AgencyRow[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  function buildHref(nextCountry: string | null, nextPage: number) {
    const p = new URLSearchParams()
    if (nextCountry) p.set('country', nextCountry)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return qs ? `/agents?${qs}` : '/agents'
  }

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="relative max-w-2xl">
          <div className="pointer-events-none absolute -inset-x-10 -top-24 -z-10 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,var(--brand-soft),transparent)]" aria-hidden="true" />
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">Trusted travel professionals</h1>
          <p className="mt-4 text-pretty text-lg leading-8 text-muted-foreground">
            {total} verified {total === 1 ? 'agent' : 'agents'} ready to serve you — every one completes business verification before trading.
          </p>
        </div>

        {/* Country filter */}
        {countries.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by country">
            <Link href={buildHref(null, 1)} className={cn('rounded-full border px-3 py-1 text-sm transition', !country ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted')}>
              All Countries
            </Link>
            {countries.map((c) => (
              <Link key={c} href={buildHref(c, 1)} className={cn('rounded-full border px-3 py-1 text-sm transition', country === c ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted')}>
                {c}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10">
          {list.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title={country ? `No verified agents in ${country} yet` : 'Agents are joining soon'}
              description={country ? 'Try a different country or browse all agents.' : 'We are onboarding our first verified agents. Check back soon.'}
              action={
                country ? (
                  <Link href="/agents" className="inline-flex rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-card transition hover:bg-muted">
                    View all agents
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => {
                const rating = Number(a.rating ?? 0)
                return (
                  <Link
                    key={a.id}
                    href={`/agencies/${a.slug}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 surface-soft transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-soft-lg active:scale-[0.995]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold group-hover:text-primary">{a.name}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" /> {a.city || a.country || 'Nigeria'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success-foreground">
                        <BadgeCheck className="size-3.5" /> Verified business
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-x-6 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
                      {rating > 0 && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Star className="size-4 fill-amber-400 text-amber-400" /> {rating.toFixed(1)}
                        </span>
                      )}
                      <span>{Number(a.completed_orders ?? 0)} orders completed</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
            {page > 1 ? (
              <Link href={buildHref(country || null, page - 1)} className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-card transition hover:bg-muted">
                Previous
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">Previous</span>
            )}
            <span className="text-sm text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildHref(country || null, page + 1)} className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-card transition hover:bg-muted">
                Next
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">Next</span>
            )}
          </nav>
        )}
      </main>
    </div>
  )
}