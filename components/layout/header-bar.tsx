'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/marketplace', label: 'Find services' },
  { href: '/agents', label: 'Verified Agents' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/onboarding', label: 'Sell travel services' },
]

/** Scroll-aware marketing header. When `overlay` is set, it starts
 *  transparent and settles into a blurred, bordered surface on scroll.
 *  `logo` is a server-rendered element (CMS-driven) passed from the layout. */
export function HeaderBar({
  signedIn,
  overlay = false,
  logo,
}: {
  signedIn: boolean
  overlay?: boolean
  logo: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = !overlay || scrolled

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300',
        solid ? 'border-b border-border/80 bg-background/85 backdrop-blur-md' : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        {logo}

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-muted hover:text-foreground',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 hover:shadow-soft hover:opacity-95 active:scale-[0.98]"
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
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 hover:shadow-soft hover:opacity-95 active:scale-[0.98]"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <MobileMenu signedIn={signedIn} />
      </div>
    </header>
  )
}