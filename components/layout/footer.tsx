import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

/** Public marketing footer (adopted from TTX Next). */
export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Africa&apos;s trusted B2B and B2C travel marketplace. Verified agencies, secure escrow, and global travel services.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-eyebrow text-muted-foreground">Marketplace</p>
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
          <p className="font-eyebrow text-muted-foreground">Company</p>
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
          <p className="font-eyebrow text-muted-foreground">Account</p>
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
          <p className="font-eyebrow text-muted-foreground">Legal</p>
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