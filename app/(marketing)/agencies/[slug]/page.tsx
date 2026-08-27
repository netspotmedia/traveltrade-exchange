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
import { ServiceCard } from '@/components/service-card'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { VerificationBadges } from '@/components/ui/verification-badges'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { formatNumber, formatResponseTime } from '@/lib/format'

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

  let agency: {
    id: string; name: string; slug: string; city: string | null; country: string | null
    verification_status: string; rating: number | null; completed_orders: number | null
    verifications: string[] | null
  } | null = null
  let responseStats: { avgResponseHours: number | null; responseRate: number | null } | null = null
  let list: ServiceRow[] = []

  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('agencies')
      .select('id, name, slug, city, country, verification_status, rating, completed_orders, verifications')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    agency = data

    if (agency) {
      const { data: stats } = await supabase.rpc('agency_response_stats', { p_agency_id: agency.id })
      const s = stats as { avg_response_hours?: number | null; response_rate?: number | null } | null
      responseStats = { avgResponseHours: s?.avg_response_hours ?? null, responseRate: s?.response_rate ?? null }

      const { data: services } = await supabase
        .from('services')
        .select('*, agencies(name, slug, verification_status, rating, city)')
        .eq('agency_id', agency.id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      list = (services ?? []) as ServiceRow[]
    }
  } catch {
    // Supabase unavailable — show empty state
  }

  if (!agency) notFound()

  const verified = agency.verification_status === 'verified'
  const rating = Number(agency.rating ?? 0)
  const responseLabel = formatResponseTime(responseStats?.avgResponseHours ?? null)

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Reveal>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to marketplace
          </Link>
        </Reveal>

        {/* Profile header */}
        <Reveal delay={60}>
          <section className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="pointer-events-none absolute -inset-x-10 -top-32 -z-10 h-64 bg-[radial-gradient(60%_100%_at_20%_0%,var(--brand-soft),transparent)]" aria-hidden="true" />
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <Avatar name={agency.name} size="xl" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{agency.name}</h1>
                    <StatusBadge domain="agency" status={agency.verification_status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <MapPin className="mr-1 inline size-3.5" />
                    {agency.city || agency.country || 'Nigeria'}
                  </p>
                  <div className="mt-3">
                    <VerificationBadges verifications={agency.verifications as string[] | null} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {rating > 0 && (
                  <div>
                    <p className="flex items-center gap-1 font-mono text-2xl font-semibold">
                      <Star className="size-5 fill-accent text-accent" />
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
                {responseStats?.responseRate != null && (
                  <div>
                    <p className="font-mono text-2xl font-semibold">{responseStats.responseRate}%</p>
                    <p className="text-xs text-muted-foreground">Response rate</p>
                  </div>
                )}
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
                <p className="text-sm font-semibold">Quick responses</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {responseLabel ?? 'Message the agent inside your order, with one shared record.'}
                </p>
              </div>
            </div>
          </div>
        </section>
        </Reveal>

        {/* Services */}
        <Reveal delay={120}>
          <section className="mt-14">
          <SectionHeader title={`Services by ${agency.name}`} description="Every service includes protected payments." />

          <div className="mt-8">
            {list.length === 0 ? (
              <EmptyState
                icon={Compass}
                title="No published services yet"
                description={verified ? 'This agent will add services soon.' : 'This agent is finishing verification and will add services soon.'}
              />
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
        </Reveal>

        {/* How to work together */}
        <Reveal delay={180}>
          <section className="mt-14 mb-4">
            <div className="rounded-4xl bg-primary p-6 text-primary-foreground shadow-soft-lg sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-foreground/15" aria-hidden="true">
                  <Handshake className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Working with this agent</h2>
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
        </Reveal>
      </main>
    </div>
  )
}