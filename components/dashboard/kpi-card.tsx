import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  /** Optional accent — "primary" renders a navy emphasis card. */
  accent?: 'primary' | 'default'
  className?: string
}

/** Modern KPI card — icon chip, mono value, contextual hint. */
export function KpiCard({ label, value, hint, icon: Icon, accent = 'default', className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-[1.25rem] border p-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        accent === 'primary'
          ? 'border-transparent bg-primary text-primary-foreground shadow-soft'
          : 'border-border bg-card shadow-soft hover:shadow-soft-lg',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn('text-sm', accent === 'primary' ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{label}</p>
        {Icon && (
          <span
            className={cn(
              'grid size-9 place-items-center rounded-xl',
              accent === 'primary' ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-brand-soft text-brand',
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={cn('mt-3 font-mono text-2xl font-semibold tracking-tight', accent === 'primary' ? 'text-white' : 'text-foreground')}>
        {value}
      </p>
      {hint && <p className={cn('mt-1 text-xs', accent === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{hint}</p>}
    </div>
  )
}