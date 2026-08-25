import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { HeroSearch } from '@/components/home/hero-search'
import { HeroTracker } from '@/components/home/hero-tracker'
import { formatNumber } from '@/lib/format'

interface HomeHeroProps {
  variant: 'a' | 'b'
  serviceCount: number
  verifiedAgents: number
  completedOrders: number
  /** Optional CMS-driven hero copy (falls back to built-in defaults). */
  copy?: {
    badge?: string
    title?: string
    description?: string
  }
}

const DEFAULT_COPY = {
  a: {
    badge: 'Trusted travel professionals, verified',
    title: 'Find trusted travel professionals for your next trip',
    description:
      'Compare verified travel agents, agree on clear milestones, and keep every naira protected until the work is delivered.',
  },
  b: {
    badge: 'Protected payments, end to end',
    title: "Book verified travel experts. Pay only when it's done right.",
    description:
      'Get proposals from vetted agents, agree on clear milestones, and release payment only when you approve the work.',
  },
}

export function HomeHero({ variant, serviceCount, verifiedAgents, completedOrders, copy }: HomeHeroProps) {
  const isB = variant === 'b'
  const d = DEFAULT_COPY[isB ? 'b' : 'a']
  const text = {
    badge: copy?.badge ?? d.badge,
    title: copy?.title ?? d.title,
    description: copy?.description ?? d.description,
  }

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,var(--brand-soft),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 text-center lg:px-8 lg:pb-24 lg:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-card">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {text.badge}
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl">
          {text.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
          {text.description}
        </p>

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