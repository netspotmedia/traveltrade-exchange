import Link from 'next/link'
import { Compass, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden="true">
          <Search className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          We couldn't find that page. It may have moved, or the link may be out of date.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/marketplace">
            <Button size="lg">
              <Search className="size-4" aria-hidden="true" /> Browse services
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg">
              <Compass className="size-4" aria-hidden="true" /> Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}