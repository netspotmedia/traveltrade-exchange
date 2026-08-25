'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'

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
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-card px-4 py-3 shadow-lift md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => go(l.href)}
                className="rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted"
              >
                {l.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => go(signedIn ? '/dashboard' : '/auth/sign-up')}
              className="mt-1 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground"
            >
              {signedIn ? 'Open workspace' : 'Get started'}
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}