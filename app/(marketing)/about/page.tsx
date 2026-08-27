import Link from 'next/link'
import type { Metadata } from 'next'
import { BadgeCheck, Compass, FileText, Lock } from 'lucide-react'
import { getCmsPage } from '@/lib/cms'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeader } from '@/components/ui/section-header'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about TravelTrade Exchange — Africa\'s trusted B2B and B2C travel marketplace connecting verified agencies with customers.',
}

const VALUES = [
  { icon: BadgeCheck, title: 'Trust first', body: 'Every agency passes business verification before trading, so you know who you are working with.' },
  { icon: Lock, title: 'Payment protected', body: 'Escrow holds funds until you approve delivered work, and fair dispute support is built in.' },
  { icon: FileText, title: 'Transparent', body: 'Clear milestones, visible pricing and one shared record for every order.' },
  { icon: Compass, title: 'Built for travel', body: 'Designed around the realities of African travel businesses — from verification to NGN-first payments.' },
]

const PROTECTIONS = [
  'Every agency undergoes business (KYB-style) verification before trading.',
  'Payments are held in escrow and only released when you approve delivered work.',
  'Milestone-based payment plans give both parties clarity on deliverables.',
  'Dispute resolution provides a fair mechanism when things go wrong.',
  'Full transaction history for complete financial transparency.',
]

export default async function AboutPage() {
  const cms = await getCmsPage('about')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'A safer way to move travel work forward'
  const description =
    typeof hero.description === 'string'
      ? hero.description
      : 'TravelTrade Exchange (TTX) connects verified travel agencies with customers on one trusted platform — where trust is enforced at every step, from verification and protected payments to milestone-based delivery and dispute resolution.'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <Reveal>
          <div className="relative max-w-2xl">
            <div className="pointer-events-none absolute -inset-x-10 -top-24 -z-10 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,var(--brand-soft),transparent)]" aria-hidden="true" />
            <p className="font-eyebrow text-primary">About</p>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">{title}</h1>
            <p className="mt-4 text-pretty leading-7 text-muted-foreground">{description}</p>
          </div>
        </Reveal>

        {/* Principles — editorial split (statement + list) instead of four
            identical cards, so the page reads as a brand story rather than
            a repeated feature grid. */}
        <section className="mt-20">
          <Reveal>
            <SectionHeader eyebrow="What we build on" title="Four principles, never traded off." />
          </Reveal>
          <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <p className="font-display text-2xl font-medium leading-snug tracking-tight text-foreground lg:sticky lg:top-28">
                Every decision on TTX starts from the same question: does this make it safer to trade with someone
                you've never met before?
              </p>
            </Reveal>
            <div className="flex flex-col divide-y divide-border">
              {VALUES.map((v, i) => (
                <Reveal key={v.title} delay={i * 80}>
                  <div className="flex items-start gap-5 py-6 first:pt-0 last:pb-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <v.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{v.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{v.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Reveal>
          <section className="mt-20 glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">How TTX protects every transaction</h2>
            <div className="mt-6 flex flex-col gap-3">
              {PROTECTIONS.map((p) => (
                <div key={p} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                  {p}
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Final CTA — matches the homepage's hero-scale container exactly
            (rounded-4xl + shadow-soft-lg) rather than the smaller rounded-3xl
            used previously, so the two "hero-scale" moments sitewide agree. */}
        <section className="py-20">
          <Reveal>
            <div className="flex flex-col items-center justify-between gap-8 rounded-4xl bg-primary px-8 py-14 text-primary-foreground shadow-soft-lg lg:flex-row lg:px-16">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to get started?</h2>
                <p className="mt-3 text-pretty text-primary-foreground/80">Join verified travel professionals and customers trading with confidence.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/marketplace" className="inline-flex h-12 items-center rounded-lg bg-primary px-7 text-base font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]">
                  Explore services
                </Link>
                <Link href="/auth/sign-up" className="inline-flex h-12 items-center rounded-full border border-primary-foreground/30 px-7 text-base font-semibold text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-foreground/10 active:scale-[0.98]">
                  Create an account
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  )
}