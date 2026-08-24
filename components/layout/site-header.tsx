import Link from 'next/link'
import { Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/marketplace', label: 'Find services' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/onboarding', label: 'Sell travel services' },
]

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="TravelTrade Exchange home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card" aria-hidden="true">
            <Compass className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">TravelTrade</span>
            <span className="block text-sm font-semibold tracking-tight text-foreground">Exchange</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <MobileMenu signedIn={Boolean(user)} />
      </div>
    </header>
  )
}