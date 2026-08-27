'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/marketplace', label: 'Find services' },
  { href: '/agents', label: 'Verified Agents' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
  { href: '/onboarding', label: 'Sell travel services' },
]

export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-xl glass-card text-foreground transition hover:bg-muted active:scale-[0.97]"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-50 border-b border-border/50 bg-surface/80 backdrop-blur-sm px-4 py-3 shadow-lift"
        >
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
              return (
                <button
                  key={l.href}
                  type="button"
                  onClick={() => go(l.href)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'min-h-11 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-muted',
                    active ? 'bg-muted text-foreground' : 'text-foreground',
                  )}
                >
                  {l.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => go(signedIn ? '/dashboard' : '/auth/sign-up')}
              className="mt-1.5 min-h-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:shadow-xl active:scale-[0.98]"
            >
              {signedIn ? 'Open workspace' : 'Get started'}
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}