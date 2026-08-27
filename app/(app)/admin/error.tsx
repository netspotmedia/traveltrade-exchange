'use client'

import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm leading-6 text-muted-foreground">The admin screen hit an unexpected error. Your data is safe.</p>
        <button
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all hover:shadow-xl"
        >
          Try again
        </button>
      </div>
    </div>
  )
}