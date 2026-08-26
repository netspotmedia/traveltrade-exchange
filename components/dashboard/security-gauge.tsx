'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { AnimatedCounter } from '@/components/dashboard/animated-counter'

interface SecurityGaugeProps {
  value: number
  size?: 'sm' | 'md'
  className?: string
}

/** Animated radial standing gauge — single-track arc with a rounded cap,
 *  drawn in once on view. Pure SVG, no chart library. */
export function SecurityGauge({ value, size = 'md', className }: SecurityGaugeProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const dim = size === 'sm' ? 104 : 160
  const r = dim / 2 - 15
  const stroke = size === 'sm' ? 11 : 14
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(100, Math.max(0, value)) / 100)

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: dim, height: dim }} role="img" aria-label={`Security score ${value}%`}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#d8e3fb" strokeWidth={stroke} />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={mounted ? offset : c}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#003527" />
            <stop offset="100%" stopColor="#80bea6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <AnimatedCounter
            value={value}
            mode="percent"
            className={cn('font-display font-semibold tracking-tight text-primary', size === 'sm' ? 'text-2xl' : 'text-4xl')}
          />
          <p className={cn('font-eyebrow mt-0.5 text-on-surface-variant', size === 'sm' ? 'text-[9px]' : 'text-[10px]')}>Secure</p>
        </div>
      </div>
    </div>
  )
}