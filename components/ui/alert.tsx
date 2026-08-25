import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

const CONFIG: Record<
  AlertVariant,
  { icon: typeof Info; wrap: string; iconCls: string; role: 'alert' | 'status' }
> = {
  success: { icon: CheckCircle2, wrap: 'bg-success/25 text-success-foreground', iconCls: 'text-success-foreground', role: 'status' },
  warning: { icon: AlertTriangle, wrap: 'bg-warning/25 text-warning-foreground', iconCls: 'text-warning-foreground', role: 'status' },
  error: { icon: XCircle, wrap: 'bg-destructive/10 text-destructive', iconCls: 'text-destructive', role: 'alert' },
  info: { icon: Info, wrap: 'bg-info/25 text-info-foreground', iconCls: 'text-info-foreground', role: 'status' },
}

export interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
  /** When set, also shows a bold heading above the body. */
  title?: string
}

/** Shared feedback banner — consistent success/warning/error/info states with
 *  accessible live-region semantics (role=status for non-critical updates,
 *  role=alert for errors needing immediate attention). Meaning is never
 *  conveyed by color alone (icon + text always present). */
export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const cfg = CONFIG[variant]
  const Icon = cfg.icon
  return (
    <div role={cfg.role} className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 text-sm', cfg.wrap, className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', cfg.iconCls)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  )
}

export type { AlertVariant }