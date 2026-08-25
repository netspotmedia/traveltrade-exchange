import Link from 'next/link'
import { FileCheck2, Handshake, Lock, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

const TRUST = [
  { icon: ShieldCheck, label: 'Verified professionals' },
  { icon: Lock, label: 'Secure payments' },
  { icon: Handshake, label: 'Escrow protection' },
  { icon: FileCheck2, label: 'Clear agreements' },
] as const

const COLUMNS = [
  {
    label: 'Marketplace',
    links: [
      { href: '/marketplace', label: 'Browse services' },
      { href: '/agents', label: 'Verified agents' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/onboarding', label: 'Sell travel services' },
    ],
  },
  {
    label: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/help', label: 'Help center' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/auth/login', label: 'Sign in' },
      { href: '/auth/sign-up', label: 'Create an account' },
      { href: '/dashboard', label: 'Open workspace' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of service' },
      { href: '/privacy', label: 'Privacy policy' },
    ],
  },
] as const

/** Global marketing footer — a confident brand close: editorial statement,
 *  trust signals and clear navigation on a quiet brand-tinted surface. */
export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-soft/60">
      {/* Hairline seam + restrained ambient fields */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(14_124_102/0.08),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-30%] left-[-8%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(232_163_61/0.07),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] lg:gap-8">
          {/* Brand statement */}
          <div className="max-w-sm">
            <Logo />
            <p className="font-display mt-6 text-2xl font-semibold leading-snug tracking-tight text-foreground">
              One protected marketplace for global travel.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Find verified travel professionals, agree on clear milestones, and pay with confidence — escrow holds
              every payment until the work is delivered.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Why you can trust TravelTrade Exchange">
              {TRUST.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                  <item.icon className="size-4 text-secondary" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation columns */}
          {COLUMNS.map((col) => (
            <nav key={col.label} aria-label={col.label} className="space-y-3">
              <p className="font-eyebrow text-primary">{col.label}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group relative inline-flex items-center text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {l.label}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-secondary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} TravelTrade Exchange. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 text-secondary" aria-hidden="true" />
            Escrow-protected payments on every order
          </p>
        </div>
      </div>
    </footer>
  )
}