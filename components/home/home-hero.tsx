import { CheckCircle2, ShieldCheck } from 'lucide-react'
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
    title: 'Find the right travel professional for your journey.',
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
      {/* Layered ambient depth — brand-derived color fields, never fake photography */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-[34rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)] opacity-90" />
        <div className="absolute right-[-10%] top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(232_163_61_/0.10),transparent)]" />
        <div className="absolute bottom-[-6%] left-[-6%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(14_124_102_/0.10),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-primary shadow-soft backdrop-blur-sm">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {text.badge}
          </span>

          <h1 className="font-display mt-7 text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-[4.25rem]">
            {text.title}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
            {text.description}
          </p>

          {/* Search is the dominant interaction */}
          <div className="mt-10">
            <HeroSearch variant={variant} />
          </div>
        </div>

        {/* Trust statistics */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 border-t border-border/70 pt-8 text-center sm:gap-8">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{formatNumber(serviceCount)}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Travel services live</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{formatNumber(verifiedAgents)}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Verified agents</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{formatNumber(completedOrders)}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{isB ? 'Orders delivered' : 'Orders completed'}</p>
          </div>
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