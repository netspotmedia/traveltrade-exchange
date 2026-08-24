import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Compass,
  FileText,
  Lock,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Star,
  Timer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { ServiceCard } from '@/components/service-card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { categoryIcon } from '@/lib/categories'
import { formatMoney, formatNumber } from '@/lib/format'

type Agency = { name: string; slug: string; verification_status: string; rating: number; city: string | null; completed_orders: number }

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('*, agencies(name, slug, verification_status, rating, city, completed_orders)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!service) notFound()

  const agency = (Array.isArray(service.agencies) ? service.agencies[0] : service.agencies) as Agency | undefined
  const isInstant = service.ordering_mode === 'instant_order'
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'

  // Related services in the same category (honest recommendation, real data).
  const { data: related } = await supabase
    .from('services')
    .select('*, agencies(name, slug, verification_status, rating, city)')
    .eq('status', 'published')
    .eq('category', service.category)
    .neq('id', service.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  const ctaHref = isInstant ? `/orders/new?service=${service.id}` : `/requests/new?service=${service.id}`
  const ctaLabel = isInstant ? 'Order now' : 'Request a quote'

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div className="flex flex-col gap-8">
            {/* Overview */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-4">
                  <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="size-8" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{service.category}</Badge>
                      {isInstant && <Badge variant="brand" className="bg-primary text-primary-foreground">Instant order</Badge>}
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{service.title}</h1>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                {rating > 0 && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)} rating
                  </span>
                )}
                {verified && (
                  <span className="flex items-center gap-1.5 text-success-foreground">
                    <BadgeCheck className="size-4" /> Verified agent
                  </span>
                )}
                {(service.location || agency?.city) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {service.location || agency?.city}
                  </span>
                )}
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold">About this service</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{service.description || 'No description provided yet.'}</p>
              </div>
            </section>

            {/* How ordering works */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <h2 className="text-lg font-semibold">How it works</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {isInstant ? (
                  <>
                    <Step n="1" title="Place your order" body="Order the service at the listed price. You only pay when you confirm the details." />
                    <Step n="2" title="Payment is secured" body="Your payment is held safely and only released when you approve the delivered work." />
                    <Step n="3" title="Track and approve" body="Follow progress, message the agent, and approve delivery when you are satisfied." />
                  </>
                ) : (
                  <>
                    <Step n="1" title="Request a quote" body="Tell the agent your requirement — dates, group size, and what you need." />
                    <Step n="2" title="Agree on milestones" body="The agent sends a proposal with a clear plan and payment milestones." />
                    <Step n="3" title="Pay securely" body="Once you agree, payment is secured and released milestone by milestone." />
                  </>
                )}
              </div>
            </section>

            {/* Secure payment */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Lock className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Your payment is protected</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Money only moves when work is delivered and approved. If you and the agent can't agree, our support team reviews the
                    case and releases funds fairly. Every payment is tracked on one clear record.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Payment secured on order</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Approved before release</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Fair dispute support</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            {/* Booking panel */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="mt-1 font-mono text-3xl font-semibold">{formatMoney(service.base_price, service.currency)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isInstant ? 'Order now and secure your booking.' : 'Request a quote — the final plan is agreed before you pay.'}
              </p>
              <Link href={ctaHref} className="mt-5 block">
                <Button size="lg" className="w-full h-12 text-base">
                  {ctaLabel}
                </Button>
              </Link>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Verified agent</li>
                <li className="flex items-center gap-2"><Lock className="size-4 text-primary" /> Payment protected</li>
                <li className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" /> Message the agent</li>
              </ul>
            </section>

            {/* Agent preview */}
            {agency && (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-sm font-semibold text-muted-foreground">Travel professional</h2>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={agency.name} size="lg" />
                  <div className="min-w-0">
                    <Link href={`/agencies/${agency.slug}`} className="truncate font-semibold hover:text-primary hover:underline">
                      {agency.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{agency.city || 'Nigeria'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  {rating > 0 && (
                    <span className="flex items-center gap-2"><Star className="size-4 fill-amber-400 text-amber-400" /> {rating.toFixed(1)} rating</span>
                  )}
                  <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-primary" /> {verified ? 'Verified business' : 'Verification in progress'}</span>
                  {Number(agency.completed_orders) > 0 && (
                    <span className="flex items-center gap-2"><FileText className="size-4 text-primary" /> {formatNumber(agency.completed_orders)} orders completed</span>
                  )}
                  <span className="flex items-center gap-2"><Timer className="size-4 text-primary" /> Replies within the order conversation</span>
                </div>
                <Link
                  href={`/agencies/${agency.slug}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  View profile
                </Link>
              </section>
            )}
          </aside>
        </div>

        {/* Related services */}
        {related && related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(related as RelatedRow[]).map((s) => {
                const a = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
                return <ServiceCard key={s.id} service={{ ...s, agencies: a as RelatedRow['agencies'] }} />
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>TravelTrade Exchange — a safer way to move travel work forward.</p>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Compass className="size-4" /> Browse all services
          </Link>
        </div>
      </footer>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <span className="font-mono text-sm text-primary">{n}</span>
      <h3 className="mt-1 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

type RelatedRow = {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  location: string | null
  base_price: number
  currency: string
  ordering_mode: string | null
  agencies: Agency | Agency[] | null
}