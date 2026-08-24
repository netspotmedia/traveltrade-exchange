import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  Compass,
  Handshake,
  Lock,
  MapPin,
  Star,
  Timer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { ServiceCard } from '@/components/service-card'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'

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
  agencies: { name: string; slug: string; verification_status: string; rating: number; city: string | null } | null
}

export default async function AgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Public RLS policy allows reading verified agencies (and the owner their own).
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, city, country, verification_status, rating, completed_orders')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!agency) notFound()

  const verified = agency.verification_status === 'verified'
  const rating = Number(agency.rating ?? 0)

  const { data: services } = await supabase
    .from('services')
    .select('*, agencies(name, slug, verification_status, rating, city)')
    .eq('agency_id', agency.id)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const list = (services ?? []) as ServiceRow[]

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>

        {/* Profile header */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <Avatar name={agency.name} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{agency.name}</h1>
                  <StatusBadge domain="agency" status={agency.verification_status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <MapPin className="mr-1 inline size-3.5" />
                  {agency.city || agency.country || 'Nigeria'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {rating > 0 && (
                <div>
                  <p className="flex items-center gap-1 font-mono text-2xl font-semibold">
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              )}
              <div>
                <p className="font-mono text-2xl font-semibold">{formatNumber(agency.completed_orders)}</p>
                <p className="text-xs text-muted-foreground">Orders completed</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold">{list.length}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                <BadgeCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{verified ? 'Verified business' : 'Verification in progress'}</p>
                <p className="text-xs leading-5 text-muted-foreground">Business documents reviewed before going live.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                <Lock className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Protected payments</p>
                <p className="text-xs leading-5 text-muted-foreground">Funds are held securely and released on approval.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                <Timer className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Clear communication</p>
                <p className="text-xs leading-5 text-muted-foreground">Message the agent inside your order, with one shared record.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Services by {agency.name}</h2>
              <p className="mt-1 text-muted-foreground">Every service includes protected payments.</p>
            </div>
          </div>

          <div className="mt-6">
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
                {verified ? 'No published services yet.' : 'This agent is finishing verification and will add services soon.'}
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => {
                  const a = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
                  return <ServiceCard key={s.id} service={{ ...s, agencies: a as ServiceRow['agencies'] }} />
                })}
              </div>
            )}
          </div>
        </section>

        {/* How to work together */}
        <section className="mt-10">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-foreground/15" aria-hidden="true">
                <Handshake className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Working with this agent</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/85">
                  Request a quote or order a service, agree on clear milestones, and keep every naira protected until the work is
                  delivered and approved. One clear record covers proposals, milestones, delivery and messages.
                </p>
                <Link href="/marketplace" className="mt-4 inline-block">
                  <Button className="bg-white text-primary hover:bg-white/90">Explore the marketplace</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-14 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>TravelTrade Exchange — a safer way to move travel work forward.</p>
          <div className="flex gap-5">
            <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Compass className="size-4" /> Home
            </Link>
            <Link href="/marketplace" className="hover:text-foreground">
              Marketplace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}