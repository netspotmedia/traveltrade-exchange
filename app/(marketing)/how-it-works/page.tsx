import Link from 'next/link'
import type { Metadata } from 'next'
import { BadgeCheck, FileText, Handshake, Lock, Search, WalletCards } from 'lucide-react'
import { getCmsPage } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how TravelTrade Exchange works — from finding a verified professional to protected, milestone-based payments.',
}

const STEPS = [
  { n: '01', icon: Search, title: 'Find your specialist', body: 'Search verified travel professionals and compare services, ratings and prices in one place.' },
  { n: '02', icon: Handshake, title: 'Agree on the plan', body: 'Request a quote or book instantly. You and the agent agree on clear milestones before anything starts.' },
  { n: '03', icon: WalletCards, title: 'Pay securely', body: 'Your payment is held in escrow and only released when you approve the delivered work — milestone by milestone.' },
  { n: '04', icon: FileText, title: 'Track one clear record', body: 'Briefs, proposals, milestones, delivery and messages all live on one shared timeline for both parties.' },
  { n: '05', icon: BadgeCheck, title: 'Approve and release', body: 'Review each delivered milestone and release payment only when you are satisfied with the work.' },
  { n: '06', icon: Lock, title: 'Get protected', body: 'If something goes wrong, raise a dispute. Our team reviews the evidence and releases funds fairly.' },
]

const TRUST = [
  { icon: BadgeCheck, title: 'Verified agents', body: 'Every agent completes business verification before their services go live.' },
  { icon: Lock, title: 'Payment protected', body: 'Money only moves when work is delivered and approved.' },
  { icon: FileText, title: 'One clear record', body: 'Proposals, milestones, delivery and messages on one shared timeline.' },
]

export default async function HowItWorksPage() {
  const cms = await getCmsPage('how-it-works')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'From brief to boarding pass'
  const description =
    typeof hero.description === 'string'
      ? hero.description
      : 'No complicated contracts. Just a clear, protected agreement with a trusted travel professional.'

  return (
    <div className="min-h-[100dvh] bg-background">
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-eyebrow text-primary">One clear workflow</p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-pretty text-muted-foreground">{description}</p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="group glass-card flex flex-col gap-5 rounded-2xl p-7 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-primary-foreground">
                  <s.icon className="size-5" />
                </span>
                <span className="font-display text-sm italic text-primary/70">{s.n}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-16 rounded-3xl border-y border-border bg-muted/35 px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Why travel with TTX</h2>
            <p className="mt-2 text-muted-foreground">We built the trust layer into every step of the journey.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="glass-panel rounded-2xl p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <t.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-primary px-8 py-12 text-primary-foreground lg:flex-row lg:px-14">
            <div className="max-w-xl text-center lg:text-left">
              <h2 className="text-3xl font-semibold tracking-tight">Ready to move your travel work forward?</h2>
              <p className="mt-3 text-primary-foreground/80">
                Find a verified professional or sell your own travel services — all with protected payments.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/marketplace" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl">
                Explore services
              </Link>
              <Link href="/onboarding" className="rounded-xl border border-primary-foreground/30 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
                Sell your services
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}