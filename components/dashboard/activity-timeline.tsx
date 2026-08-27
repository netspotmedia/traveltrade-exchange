'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/dashboard'

export interface ActivityEntry {
  id: string
  kind: 'escrow' | 'attention' | 'alert' | 'done'
  title: string
  body: string
  iso: string
  /** Pre-computed label (avoids SSR/hydration drift); refreshed client-side. */
  label: string
}

const DOT: Record<ActivityEntry['kind'], string> = {
  escrow: 'bg-primary-fixed border-primary-fixed-dim',
  attention: 'bg-secondary-fixed border-secondary-fixed-dim',
  alert: 'bg-surface-container-high border-outline-variant',
  done: 'bg-primary-fixed-dim border-primary',
}

interface ActivityTimelineProps {
  entries: ActivityEntry[]
  viewAllHref: string
}

/** Recent activity timeline — relative timestamps that stay fresh, with a
 *  colour-coded dot per event kind. Runs entirely on the client. */
export function ActivityTimeline({ entries, viewAllHref }: ActivityTimelineProps) {
  const [labels, setLabels] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((e) => [e.id, e.label])))

  useEffect(() => {
    const refresh = () => setLabels((prev) => {
      const next: Record<string, string> = {}
      for (const e of entries) next[e.id] = timeAgo(e.iso)
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    })
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary-fixed-dim/60 bg-surface-container-low/50 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary-fixed/30 text-primary" aria-hidden="true">
          <BellRing className="size-6" />
        </span>
        <div>
          <p className="font-semibold text-primary">Nothing to show yet</p>
          <p className="mt-1 max-w-sm text-sm text-on-surface-variant">Once you search, order, message an agent, or fund a booking, your activity will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-6 pl-6">
      <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary-fixed-dim/70 via-surface-variant to-transparent" />
      {entries.map((e) => (
        <div key={e.id} className="relative">
          <span aria-hidden="true" className={cn('absolute -left-6 top-1 size-4 rounded-full border-2 border-white shadow-sm', DOT[e.kind])} />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{labels[e.id] ?? e.label}</span>
            <p className="text-sm font-bold text-primary">{e.title}</p>
            {e.body && <p className="text-sm leading-5 text-on-surface-variant">{e.body}</p>}
          </div>
        </div>
      ))}
      <div className="pt-1">
        <Link
          href={viewAllHref}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-fixed-dim/60 bg-white/40 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary-fixed-dim hover:bg-primary-fixed/20"
        >
          View full log <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}