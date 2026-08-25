import Link from 'next/link'
import type { Metadata } from 'next'
import { BadgeCheck, MapPin, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/avatar'

export const metadata: Metadata = {
  title: 'Verified Agents',
  description:
    'Browse verified travel agencies on TravelTrade Exchange — trusted professionals you can work with on protected payments.',
}

type AgencyRow = {
  id: string
  name: string
  slug: string
  country: string
  city: string | null
  rating: number
  completed_orders: number
}

export default async function AgentsPage() {
  const supabase = await createClient()

  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name, slug, country, city, rating, completed_orders')
    .eq('verification_status', 'verified')
    .is('deleted_at', null)
    .order('rating', { ascending: false })
    .limit(24)

  const list = (agencies ?? []) as AgencyRow[]

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Verified Agents</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Trusted travel professionals</h1>
          <p className="mt-2 text-muted-foreground">
            Every agent completes business verification before trading. Work with confidence on protected payments.
          </p>
        </div>

        <div className="mt-10">
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-12 text-center text-sm text-muted-foreground">
              We are onboarding our first verified agents. Check back soon.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => {
                const rating = Number(a.rating ?? 0)
                return (
                  <Link
                    key={a.id}
                    href={`/agencies/${a.slug}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
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
      </main>
    </div>
  )
}