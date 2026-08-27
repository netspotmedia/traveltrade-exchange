import { FileCheck2, Handshake, Lock, ShieldCheck } from 'lucide-react'
import { HeroSearch } from '@/components/home/hero-search'
import { HeroTracker } from '@/components/home/hero-tracker'
import { HeroMarketplace, type HeroService } from '@/components/home/hero-marketplace'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HomeHeroProps {
  variant: 'a' | 'b'
  serviceCount: number
  verifiedAgents: number
  completedOrders: number
  /** Real published services shown in the marketplace preview (empty = early state). */
  services?: HeroService[]
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
    title: 'Find trusted travel professionals for your next journey.',
    description:
      'Search verified agents, compare services and prices, and keep every payment protected until the work is delivered.',
  },
  b: {
    badge: 'Protected payments, end to end',
    title: 'Travel services. Trusted professionals. One protected marketplace.',
    description:
      'Get proposals from vetted agents, agree on clear milestones, and release payment only when you approve the work.',
  },
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Verified professionals' },
  { icon: Lock, label: 'Secure payments' },
  { icon: Handshake, label: 'Escrow protection' },
  { icon: FileCheck2, label: 'Clear agreements' },
] as const

export function HomeHero({ variant, serviceCount, verifiedAgents, completedOrders, services, copy }: HomeHeroProps) {
  const isB = variant === 'b'
  const d = DEFAULT_COPY[isB ? 'b' : 'a']
  const text = {
    badge: copy?.badge ?? d.badge,
    title: copy?.title ?? d.title,
    description: copy?.description ?? d.description,
  }

  const hasStats = serviceCount > 0 || verifiedAgents > 0 || completedOrders > 0

  return (
    <section className="relative overflow-hidden">
      {/* Sophisticated depth — soft grid, fine grain, restrained brand fields */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-grid absolute inset-0" />
        <div className="bg-noise absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)] opacity-80" />
        <div className="absolute bottom-[-10%] left-[-8%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(14_124_102/0.10),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          {/* Text stack — entrance-staggered */}
          <div className="text-center lg:text-left">
            <span
              style={{ animationDelay: '0ms' }}
              className="font-eyebrow animate-hero-in inline-flex items-center gap-2 rounded-full glass-card px-3 py-1.5 text-primary shadow-soft backdrop-blur-sm"
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {text.badge}
            </span>

            <h1
              style={{ animationDelay: '70ms' }}
              className="font-display animate-hero-in mt-6 text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-[3.85rem]"
            >
              {text.title}
            </h1>

            <p
              style={{ animationDelay: '150ms' }}
              className="animate-hero-in mx-auto mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground lg:mx-0"
            >
              {text.description}
            </p>

            {/* Search is the dominant interaction */}
            <div style={{ animationDelay: '230ms' }} className="animate-hero-in mt-9">
              <HeroSearch variant={variant} />
            </div>

            {/* Compact trust signals */}
            <ul
              style={{ animationDelay: '320ms' }}
              className="animate-hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start"
              aria-label="Why you can trust TravelTrade Exchange"
            >
              {TRUST_ITEMS.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                  <item.icon className="size-4 text-secondary" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>

            {/* Live marketplace numbers — only when real */}
            {hasStats && (
              <dl
                style={{ animationDelay: '390ms' }}
                className="animate-hero-in mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start"
              >
                {serviceCount > 0 && (
                  <div className="text-center lg:text-left">
                    <dt className="font-mono text-xl font-semibold tracking-tight text-foreground">{formatNumber(serviceCount)}</dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">Travel services live</dd>
                  </div>
                )}
                {verifiedAgents > 0 && (
                  <div className="text-center lg:text-left">
                    <dt className="font-mono text-xl font-semibold tracking-tight text-foreground">{formatNumber(verifiedAgents)}</dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">Verified agents</dd>
                  </div>
                )}
                {completedOrders > 0 && (
                  <div className="text-center lg:text-left">
                    <dt className="font-mono text-xl font-semibold tracking-tight text-foreground">{formatNumber(completedOrders)}</dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">{isB ? 'Orders delivered' : 'Orders completed'}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Marketplace visual layer */}
          <div className={cn('mx-auto w-full max-w-md lg:max-w-none', !hasStats && 'lg:mt-4')}>
            <HeroMarketplace services={services ?? []} />
          </div>
        </div>
      </div>

      <HeroTracker variant={variant} />
    </section>
  )
}