'use client'

import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Handshake, Lock, Route, Scale, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { icon: Search, label: 'Discover', desc: 'Search and explore verified travel services.' },
  { icon: Scale, label: 'Compare', desc: 'Compare agents, ratings and prices side by side.' },
  { icon: Handshake, label: 'Agree', desc: 'Lock a clear brief and milestones together.' },
  { icon: Lock, label: 'Pay securely', desc: 'Funds are held safely until work is approved.' },
  { icon: Route, label: 'Track', desc: 'Follow every milestone in one shared timeline.' },
  { icon: BadgeCheck, label: 'Complete', desc: 'Approve delivery — payment is released to the agent.' },
] as const

/** The TTX journey, visualised as an animated progression. This is the
 *  presentation layer only — the underlying workflow is untouched. */
export function HeroJourney() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof window === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="mx-auto mt-16 max-w-5xl">
      {/* Horizontal journey (desktop / tablet) */}
      <ol
        className="relative hidden md:block"
        aria-label="How TravelTrade Exchange works"
      >
        {/* Base rail */}
        <div aria-hidden="true" className="absolute left-[8%] right-[8%] top-[5px] h-px bg-border" />
        {/* Animated progress */}
        <div
          aria-hidden="true"
          className={cn(
            'absolute left-[8%] right-[8%] top-[5px] h-px origin-left bg-secondary transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            started ? 'scale-x-100' : 'scale-x-0',
          )}
        />
        <div className="relative grid grid-cols-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const ready = started
            return (
              <li key={step.label} className="group flex flex-col items-center gap-3 text-center">
                <span
                  aria-hidden="true"
                  style={{ transitionDelay: ready ? `${i * 130}ms` : undefined }}
                  className={cn(
                    'grid size-[11px] place-items-center rounded-full border-2 transition-colors duration-300',
                    ready ? 'border-secondary bg-secondary' : 'border-border bg-background',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full bg-background transition-opacity', ready ? 'opacity-100' : 'opacity-0')} />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className={cn('grid size-10 place-items-center rounded-xl bg-brand-soft text-brand transition-colors duration-300', ready && 'group-hover:bg-brand group-hover:text-primary-foreground')}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-eyebrow mt-2 text-muted-foreground/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-foreground">{step.label}</span>
                  <span className="hidden max-w-[9rem] text-xs leading-5 text-muted-foreground lg:block">{step.desc}</span>
                </div>
              </li>
            )
          })}
        </div>
      </ol>

      {/* Vertical journey (mobile) */}
      <ol className="relative space-y-6 border-l border-border pl-6 md:hidden" aria-label="How TravelTrade Exchange works">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.label} className="relative">
              <span
                aria-hidden="true"
                style={{ transitionDelay: started ? `${i * 130}ms` : undefined }}
                className={cn(
                  'absolute -left-[30.5px] top-1 grid size-[13px] place-items-center rounded-full border-2 transition-colors duration-300',
                  started ? 'border-secondary bg-secondary' : 'border-border bg-background',
                )}
              >
                <span className={cn('size-1.5 rounded-full bg-background transition-opacity', started ? 'opacity-100' : 'opacity-0')} />
              </span>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-eyebrow text-muted-foreground/70">{String(i + 1).padStart(2, '0')}</p>
                  <p className="text-sm font-semibold tracking-tight text-foreground">{step.label}</p>
                </div>
              </div>
              <p className="mt-1.5 pl-12 text-xs leading-5 text-muted-foreground">{step.desc}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}