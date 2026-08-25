import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  /** Semantic tone — maps the KPI to the brand language.
   *  default: navy on neutral · teal: security/escrow · amber: attention ·
   *  solid: navy emphasis panel. */
  accent?: 'default' | 'teal' | 'amber' | 'solid'
  className?: string
}

const TONES = {
  default: {
    surface: 'border-border bg-card',
    chip: 'bg-brand-soft text-brand',
    label: 'text-muted-foreground',
    hint: 'text-muted-foreground',
    value: 'text-foreground',
  },
  teal: {
    surface: 'border-secondary/15 bg-secondary-soft',
    chip: 'bg-secondary text-secondary-foreground',
    label: 'text-secondary dark:text-success-foreground',
    hint: 'text-secondary dark:text-success-foreground',
    value: 'text-foreground',
  },
  amber: {
    surface: 'border-accent/20 bg-accent-soft',
    chip: 'bg-accent text-accent-foreground dark:text-primary-foreground',
    label: 'text-foreground dark:text-warning-foreground',
    hint: 'text-muted-foreground',
    value: 'text-foreground',
  },
  solid: {
    surface: 'border-transparent bg-primary',
    chip: 'bg-primary-foreground/15 text-primary-foreground',
    label: 'text-primary-foreground/75',
    hint: 'text-primary-foreground/70',
    value: 'text-primary-foreground',
  },
} as const

/** Modern KPI card — icon chip, mono value, contextual hint, semantic tone. */
export function KpiCard({ label, value, hint, icon: Icon, accent = 'default', className }: KpiCardProps) {
  const t = TONES[accent]

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 surface-soft transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        t.surface,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn('text-sm', t.label)}>{label}</p>
        {Icon && (
          <span
            className={cn('grid size-9 place-items-center rounded-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', t.chip)}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={cn('mt-3 font-mono text-2xl font-semibold tracking-tight', t.value)}>{value}</p>
      {hint && <p className={cn('mt-1 text-xs', t.hint)}>{hint}</p>}
    </div>
  )
}