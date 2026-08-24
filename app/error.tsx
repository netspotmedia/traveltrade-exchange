"use client"

import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Friendly, safe error boundary — never leaks stack traces or internals.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden="true">
          <Compass className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          We hit an unexpected problem loading this page. Please try again — your account and payments are safe.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <Button variant="outline" size="lg" onClick={() => (window.location.href = '/')}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  )
}