import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  FileText,
  Handshake,
  Lock,
  MapPin,
  Search,
  WalletCards,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { ServiceCard } from '@/components/service-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { HomeHero } from '@/components/home/home-hero'
import { categoryIcon, FALLBACK_CATEGORIES } from '@/lib/categories'

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

export default async function HomePage() {
  const supabase = await createClient()

  // Homepage A/B: variant is assigned sticky by middleware (ttx_hero cookie).
  const cookieStore = await cookies()
  const heroVariant = cookieStore.get('ttx_hero')?.value === 'b' ? 'b' : 'a'

  const [servicesRes, verifiedAgenciesRes, serviceCountRes, categoryRes, completedRes] = await Promise.all([
    supabase
      .from('services')
      .select('*, agencies(name, slug, verification_status, rating, city)')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified').is('deleted_at', null),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
    supabase.from('services').select('category').eq('status', 'published').is('deleted_at', null),
    supabase.from('agencies').select('completed_orders').eq('verification_status', 'verified').is('deleted_at', null),
  ])

  const services = (servicesRes.data ?? []) as ServiceRow[]
  const serviceCount = serviceCountRes.count ?? 0
  const verifiedAgents = verifiedAgenciesRes.count ?? 0
  const completedOrders = (completedRes.data ?? []).reduce((sum, a) => sum + Number(a.completed_orders ?? 0), 0)

  const realCategories = Array.from(new Set((categoryRes.data ?? []).map((c) => c.category as string).filter(Boolean)))
  const categories = realCategories.length > 0 ? realCategories.slice(0, 9) : FALLBACK_CATEGORIES

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main">
        {/* Hero — A/B variant chosen by the ttx_hero cookie */}
        <HomeHero variant={heroVariant} serviceCount={serviceCount} verifiedAgents={verifiedAgents} completedOrders={completedOrders} />

      {/* Popular services */}
      <section id="popular" className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Marketplace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Popular travel services</h2>
            <p className="mt-2 text-muted-foreground">Start with a verified travel professional.</p>
          </div>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Browse all services <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8">
          {services.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No services yet"
              description="We're onboarding our first verified travel agents. Check back soon or sign up to sell your travel services."
              action={
                <Link href="/onboarding">
                  <Button>Sell travel services</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => {
                const agency = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
                return <ServiceCard key={s.id} service={{ ...s, agencies: agency as ServiceRow['agencies'] }} />
              })}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-muted/35">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">Browse by category</h2>
          <p className="mt-2 text-muted-foreground">Whatever the trip, there's a specialist for it.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => {
              const Icon = categoryIcon(cat)
              return (
                <Link
                  key={cat}
                  href={`/marketplace?category=${encodeURIComponent(cat)}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold">{cat}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">One clear workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">From brief to boarding pass</h2>
          <p className="mt-3 text-muted-foreground">No complicated contracts. Just a clear, protected agreement with a trusted professional.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { n: '01', icon: Search, title: 'Find your specialist', body: 'Search verified travel professionals and compare services, ratings and prices in one place.' },
            { n: '02', icon: Handshake, title: 'Agree on the plan', body: 'Request a quote or book instantly. You and the agent agree on clear milestones before anything starts.' },
            { n: '03', icon: WalletCards, title: 'Pay securely, delivered with confidence', body: 'Your payment is protected in escrow and only released when you approve the delivered work.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="font-mono text-sm text-primary">{s.n}</span>
              <s.icon className="mt-4 size-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section className="border-y border-border bg-muted/35">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Why travel with TTX</h2>
            <p className="mt-3 text-muted-foreground">We built the trust layer into every step of the journey.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <BadgeCheck className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Verified agents</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every agent completes business verification before their services go live on the marketplace.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Lock className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Payment protected</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your payment is held securely and only released when you approve the delivered work. Disputes are handled fairly.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <FileText className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">One clear record</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Briefs, proposals, milestones, delivery and messages — all tracked in one shared timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-primary px-8 py-12 text-primary-foreground lg:flex-row lg:px-14">
          <div className="max-w-xl text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight">Ready to move your travel work forward?</h2>
            <p className="mt-3 text-primary-foreground/80">
              Find a verified professional or sell your own travel services — all with protected payments.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary shadow-card transition hover:opacity-90">
              Explore services
            </Link>
            <Link href="/onboarding" className="rounded-xl border border-primary-foreground/30 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
              Sell your services
            </Link>
          </div>
        </div>
      </section>

      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">TravelTrade</p>
              <p className="text-sm font-semibold">Exchange</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
            <Link href="/marketplace" className="hover:text-foreground">Find services</Link>
            <Link href="/#how-it-works" className="hover:text-foreground">How it works</Link>
            <Link href="/onboarding" className="hover:text-foreground">Sell travel services</Link>
            <Link href="/auth/login" className="hover:text-foreground">Sign in</Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            <MapPin className="mr-1 inline size-3.5" />
            Serving travellers across Nigeria and beyond.
          </p>
        </div>
      </footer>
    </div>
  )
}