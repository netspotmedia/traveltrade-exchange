import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

// A guided empty state: every empty surface helps the user take the next step.
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-6 py-14 text-center', className)}>
      {Icon && (
        <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
          <Icon className="size-6" />
        </span>
      )}
      <div>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}