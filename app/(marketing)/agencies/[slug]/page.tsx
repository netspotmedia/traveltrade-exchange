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
  const supabase = await createClient()

  // Public RLS policy allows reading verified agencies (and the owner their own).
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, slug, city, country, verification_status, rating, completed_orders, verifications')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!agency) notFound()

  const verified = agency.verification_status === 'verified'
  const rating = Number(agency.rating ?? 0)

  // Real computed response metrics.
  let responseStats: { avgResponseHours: number | null; responseRate: number | null } | null = null
  const { data: stats } = await supabase.rpc('agency_response_stats', { p_agency_id: agency.id })
  const s = stats as { avg_response_hours?: number | null; response_rate?: number | null } | null
  responseStats = { avgResponseHours: s?.avg_response_hours ?? null, responseRate: s?.response_rate ?? null }
  const responseLabel = formatResponseTime(responseStats.avgResponseHours ?? null)

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
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>

        {/* Profile header */}
        <section className="mt-6 glass-panel rounded-3xl p-6 sm:p-8">
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
              {responseStats.responseRate != null && (
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
                  <Button className="bg-primary text-on-primary hover:shadow-xl shadow-lg shadow-primary-container/20">Explore the marketplace</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}