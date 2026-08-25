import Link from 'next/link'
import { Compass } from 'lucide-react'
import { getSiteAsset } from '@/lib/cms'
import { cn } from '@/lib/utils'

/** TTX logo — wordmark + mark. Uses the CMS logo asset when configured. */
export async function Logo({ className }: { className?: string }) {
  const logo = await getSiteAsset('logo')

  if (logo?.url) {
    return (
      <Link href="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="TravelTrade Exchange home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.url} alt={logo.alt ?? 'TravelTrade Exchange'} className="h-9 w-auto" width={logo.width ?? undefined} height={logo.height ?? undefined} />
      </Link>
    )
  }

  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)} aria-label="TravelTrade Exchange home">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card" aria-hidden="true">
        <Compass className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">TravelTrade</span>
        <span className="block text-sm font-semibold tracking-tight text-foreground">Exchange</span>
      </span>
    </Link>
  )
}