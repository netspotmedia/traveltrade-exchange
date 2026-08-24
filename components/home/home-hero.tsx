import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { HeroSearch } from '@/components/home/hero-search'
import { HeroTracker } from '@/components/home/hero-tracker'
import { formatNumber } from '@/lib/format'

interface HomeHeroProps {
  variant: 'a' | 'b'
  serviceCount: number
  verifiedAgents: number
  completedOrders: number
}

export function HomeHero({ variant, serviceCount, verifiedAgents, completedOrders }: HomeHeroProps) {
  const isB = variant === 'b'

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,var(--brand-soft),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 text-center lg:px-8 lg:pb-24 lg:pt-24">
        {isB ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-card">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Protected payments, end to end
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl">
              Book verified travel experts. Pay only when it's done right.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Get proposals from vetted agents, agree on clear milestones, and release payment only when you approve the work.
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-card">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Trusted travel professionals, verified
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl">
              Find trusted travel professionals for your next trip
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Compare verified travel agents, agree on clear milestones, and keep every naira protected until the work is delivered.
            </p>
          </>
        )}

        <div className="mt-9">
          <HeroSearch variant={variant} />
        </div>

        <div className="mx-auto mt-12 flex max-w-xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
          <span>
            <strong className="block text-2xl font-semibold text-foreground">{formatNumber(serviceCount)}</strong>
            Travel services live
          </span>
          <span>
            <strong className="block text-2xl font-semibold text-foreground">{formatNumber(verifiedAgents)}</strong>
            Verified agents
          </span>
          <span className={isB ? 'flex items-center gap-1.5' : ''}>
            <strong className="block text-2xl font-semibold text-foreground">{formatNumber(completedOrders)}</strong>
            {isB ? 'Orders delivered' : 'Orders completed'}
          </span>
        </div>

        {isB && (
          <p className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" /> Verified agents</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" /> Escrow-protected payments</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" /> Fair dispute support</span>
          </p>
        )}
      </div>
      <HeroTracker variant={variant} />
    </section>
  )
}