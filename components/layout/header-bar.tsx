'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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

        <nav className="hidden items-center md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative">
                  {l.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-0 -bottom-1 h-px origin-left bg-primary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                  />
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
            >
              Open workspace
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl active:scale-[0.98]"
            >
              Get started
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <MobileMenu signedIn={signedIn} />
      </div>
    </header>
  )
}