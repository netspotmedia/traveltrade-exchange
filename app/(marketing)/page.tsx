import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCmsPage } from '@/lib/cms'
import { ServiceCard } from '@/components/service-card'
import { MarketplaceEmpty } from '@/components/marketing/marketplace-empty'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { HomeHero } from '@/components/home/home-hero'
import { HeroJourney } from '@/components/home/hero-journey'
import { categoryIcon, FALLBACK_CATEGORIES } from '@/lib/categories'
import { publicImageUrl } from '@/lib/images'

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
  images?: string[] | null
  agencies: { name: string; slug: string; verification_status: string; rating: number; city: string | null } | null
}

export default async function HomePage() {
  const supabase = await createClient()

  // Homepage A/B: variant is assigned sticky by middleware (ttx_hero cookie).
  const cookieStore = await cookies()
  const heroVariant = cookieStore.get('ttx_hero')?.value === 'b' ? 'b' : 'a'

  // Optional CMS-driven hero copy (falls back to built-in defaults in HomeHero).
  const cms = await getCmsPage('landing')
  const heroSection = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const heroCopy = {
    badge: typeof heroSection.badge === 'string' ? heroSection.badge : undefined,
    title: typeof heroSection.title === 'string' ? heroSection.title : undefined,
    description: typeof heroSection.description === 'string' ? heroSection.description : undefined,
  }

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

  // Hero marketplace preview — real published services only (never fabricated).
  const heroServices = services.slice(0, 2).map((s) => {
    const agency = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      category: s.category,
      base_price: s.base_price,
      currency: s.currency,
      imageUrl: s.images?.[0] ? publicImageUrl(s.images[0]) : null,
      agency: agency
        ? { name: agency.name, verification_status: agency.verification_status, rating: agency.rating }
        : null,
    }
  })

  // Review counts for the popular services (one batched query).
  const reviewCounts = new Map<string, number>()
  if (services.length > 0) {
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('service_id')
      .in('service_id', services.map((s) => s.id))
      .is('deleted_at', null)
    for (const r of (reviewRows ?? []) as { service_id: string }[]) {
      if (!r.service_id) continue
      reviewCounts.set(r.service_id, (reviewCounts.get(r.service_id) ?? 0) + 1)
    }
  }

  const realCategories = Array.from(new Set((categoryRes.data ?? []).map((c) => c.category as string).filter(Boolean)))
  const categories = realCategories.length > 0 ? realCategories.slice(0, 9) : FALLBACK_CATEGORIES

  return (
    <div className="min-h-screen bg-background">
      <main id="main">
        {/* Hero — A/B variant chosen by the ttx_hero cookie */}
        <HomeHero
          variant={heroVariant}
          serviceCount={serviceCount}
          verifiedAgents={verifiedAgents}
          completedOrders={completedOrders}
          services={heroServices}
          copy={heroCopy}
        />

        {/* Popular services */}
        <section id="popular" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow="Marketplace"
                title="Popular travel services"
                description="Start with a verified travel professional."
              />
              <Link
                href="/marketplace"
                className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-card transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:text-primary hover:shadow-soft"
              >
                Browse all services
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-8">
            {services.length === 0 ? (
              <MarketplaceEmpty />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => {
                  const agency = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
                  return (
                    <ServiceCard
                      key={s.id}
                      service={{ ...s, agencies: agency as ServiceRow['agencies'] }}
                      imageUrl={s.images?.[0] ? publicImageUrl(s.images[0]) : null}
                      reviewCount={reviewCounts.get(s.id) ?? null}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Categories — quiet tone change, no borders */}
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
            <Reveal>
              <SectionHeader
                eyebrow="Browse by category"
                title="Whatever the trip, there's a specialist for it."
              />
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat, i) => {
                const Icon = categoryIcon(cat)
                return (
                  <Reveal key={cat} delay={i * 60}>
                    <Link
                      href={`/marketplace?category=${encodeURIComponent(cat)}`}
                      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/15 hover:shadow-soft"
                    >
                      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-primary-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold">{cat}</span>
                      <ArrowRight
                        aria-hidden="true"
                        className="absolute right-4 top-4 size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works — the TTX journey, animated */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <Reveal>
            <SectionHeader
              align="center"
              eyebrow="One clear workflow"
              title={
                <span className="font-display font-semibold tracking-tight">
                  From brief to boarding pass
                </span>
              }
              description="No complicated contracts. Just a clear, protected agreement with a trusted professional."
            />
          </Reveal>
          <HeroJourney />
        </section>

        {/* Trust & safety */}
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
            <Reveal>
              <SectionHeader
                align="center"
                eyebrow="Why travel with TTX"
                title={
                  <span className="font-display font-semibold tracking-tight">
                    The trust layer is built into every step.
                  </span>
                }
                description="We built the trust layer into every step of the journey — so you can book with confidence, not hope."
              />
            </Reveal>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <Reveal delay={0}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-primary p-7 text-primary-foreground shadow-soft transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
                  <span className="grid size-11 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground">
                    <BadgeCheck className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Verified agents</h3>
                    <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                      Every agent completes business verification before their services go live on the marketplace.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-7 shadow-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-soft">
                  <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                    <Lock className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Payment protected</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Your payment is held securely and only released when you approve the delivered work. Disputes are handled fairly.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={200}>
                <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-7 shadow-card transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-soft">
                  <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                    <FileText className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">One clear record</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Briefs, proposals, milestones, delivery and messages — all tracked in one shared timeline.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-center justify-between gap-8 rounded-4xl bg-primary px-8 py-14 text-primary-foreground shadow-soft-lg lg:flex-row lg:px-16">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ready to move your travel work forward?
                </h2>
                <p className="mt-3 text-pretty text-primary-foreground/80">
                  Find a verified professional or sell your own travel services — all with protected payments.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/marketplace" className="inline-flex h-12 items-center rounded-full bg-white px-7 text-base font-semibold text-primary shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.98]">
                  Explore services
                </Link>
                <Link href="/onboarding" className="inline-flex h-12 items-center rounded-full border border-primary-foreground/30 px-7 text-base font-semibold text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-foreground/10 active:scale-[0.98]">
                  Sell your services
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

      </main>
    </div>
  )
}