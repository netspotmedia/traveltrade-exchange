'use client'

import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '@/lib/format'

interface AnimatedCounterProps {
  value: number
  /** Output shape — 'integer' (grouped), 'money' (formatted currency) or
   *  'percent'. Kept serialisable so it crosses the RSC boundary safely. */
  mode?: 'integer' | 'money' | 'percent'
  currency?: string | null
  duration?: number
  className?: string
}

/** Count-up number that animates when it scrolls into view.
 *  Uses a cubic-bezier(0.16,1,0.3,1) ease-out and honours
 *  prefers-reduced-motion by jumping straight to the final value. */
export function AnimatedCounter({ value, mode = 'integer', currency, duration = 1400, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    let frame = 0
    let start = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const tick = (t: number) => {
          if (!start) start = t
          const p = Math.min(1, (t - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(value * eased)
          if (p < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  const rendered =
    mode === 'money' ? formatMoney(display, currency) : mode === 'percent' ? `${Math.round(display)}%` : Math.round(display).toLocaleString('en-NG')

  return (
    <span ref={ref} className={className}>
      {rendered}
    </span>
  )
}