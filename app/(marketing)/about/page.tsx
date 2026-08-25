import Link from 'next/link'
import type { Metadata } from 'next'
import { BadgeCheck, Compass, FileText, Lock } from 'lucide-react'
import { getCmsPage } from '@/lib/cms'

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
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">About</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-muted-foreground">{description}</p>
        </div>

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <v.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
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

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-primary px-8 py-12 text-primary-foreground lg:flex-row lg:px-14">
            <div className="max-w-xl text-center lg:text-left">
              <h2 className="text-3xl font-semibold tracking-tight">Ready to get started?</h2>
              <p className="mt-3 text-primary-foreground/80">Join verified travel professionals and customers trading with confidence.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/marketplace" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary shadow-card transition hover:opacity-90">
                Explore services
              </Link>
              <Link href="/auth/sign-up" className="rounded-xl border border-primary-foreground/30 px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}