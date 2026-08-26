import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  /** Bento tone — solid (deep green emphasis), mint, gold, or neutral surface. */
  accent?: 'solid' | 'mint' | 'gold' | 'surface'
  /** Optional right-side visual (sparkline, gauge, chips…). */
  children?: React.ReactNode
  className?: string
}

const TONES = {
  solid: {
    surface: 'border-transparent bg-primary',
    chip: 'bg-white/15 text-on-primary',
    label: 'text-on-primary/70',
    hint: 'text-on-primary/75',
    value: 'text-on-primary',
    glow: 'bg-white/10',
  },
  mint: {
    surface: 'border-white/40',
    chip: 'bg-primary-container/10 text-primary',
    label: 'text-on-surface-variant',
    hint: 'text-on-surface-variant',
    value: 'text-primary',
    glow: 'bg-primary-fixed',
  },
  gold: {
    surface: 'border-white/40',
    chip: 'bg-secondary-container/30 text-secondary',
    label: 'text-on-surface-variant',
    hint: 'text-on-surface-variant',
    value: 'text-primary',
    glow: 'bg-secondary-fixed',
  },
  surface: {
    surface: 'border-white/40',
    chip: 'bg-surface-container-high text-primary',
    label: 'text-on-surface-variant',
    hint: 'text-on-surface-variant',
    value: 'text-primary',
    glow: 'bg-surface-variant',
  },
} as const

/** Glass bento KPI — caps label, icon chip, display value and a soft
 *  corner glow that blooms on hover. Follows the glass-panel world. */
export function KpiCard({ label, value, hint, icon: Icon, accent = 'mint', children, className }: KpiCardProps) {
  const t = TONES[accent]

  return (
    <div className={cn('glass-card group relative flex flex-col overflow-hidden rounded-2xl p-6', t.surface, className)}>
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute -right-6 -top-6 size-28 rounded-full opacity-20 blur-2xl transition-transform duration-700 group-hover:scale-150', t.glow)}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className={cn('font-eyebrow pt-1', t.label)}>{label}</p>
        {Icon && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', t.chip)} aria-hidden="true">
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      <div className={cn('relative z-10 mt-auto flex items-end justify-between gap-4 pt-4')}>
        <div className="min-w-0">
          <p className={cn('font-display text-[28px] font-semibold leading-tight tracking-tight md:text-[32px]', t.value)}>{value}</p>
          {hint && <div className={cn('mt-1 text-sm', t.hint)}>{hint}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}