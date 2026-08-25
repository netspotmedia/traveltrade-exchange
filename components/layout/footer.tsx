import Link from 'next/link'
import { Compass } from 'lucide-react'

/** Public marketing footer (adopted from TTX Next). */
export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 lg:px-8">
        <div className="space-y-3">
          <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="TravelTrade Exchange home">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card" aria-hidden="true">
              <Compass className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">TravelTrade</span>
              <span className="block text-sm font-semibold tracking-tight text-foreground">Exchange</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Africa&apos;s trusted B2B and B2C travel marketplace. Verified agencies, secure escrow, and global travel services.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Marketplace</p>
          <Link href="/marketplace" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Browse Services
          </Link>
          <Link href="/agents" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Verified Agents
          </Link>
          <Link href="/how-it-works" className="block text-sm text-muted-foreground transition hover:text-foreground">
            How It Works
          </Link>
          <Link href="/onboarding" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Sell Travel Services
          </Link>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Company</p>
          <Link href="/about" className="block text-sm text-muted-foreground transition hover:text-foreground">
            About
          </Link>
          <Link href="/help" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Help Center
          </Link>
          <Link href="/contact" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Contact
          </Link>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Account</p>
          <Link href="/auth/login" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Sign in
          </Link>
          <Link href="/auth/sign-up" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Create an account
          </Link>
          <Link href="/dashboard" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Open workspace
          </Link>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</p>
          <Link href="/terms" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="block text-sm text-muted-foreground transition hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground lg:px-8">
          © {new Date().getFullYear()} TravelTrade Exchange. All rights reserved.
        </div>
      </div>
    </footer>
  )
}