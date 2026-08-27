import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  /** Ambient brand light behind the header (default on). */
  ambient?: boolean
}

/** Full-width page header — editorial display title + muted description +
 *  actions row, with a soft ambient brand field behind it. */
export function PageHeader({ title, description, actions, className, ambient = true }: PageHeaderProps) {
  return (
    <div className={cn('relative flex flex-col justify-between gap-5 md:flex-row md:items-end', className)}>
      {ambient && (
        <div
          className="pointer-events-none absolute -inset-x-8 -top-24 -z-10 h-72 bg-[radial-gradient(55%_100%_at_50%_0%,var(--brand-soft),transparent)]"
          aria-hidden="true"
        />
      )}
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary text-balance sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-pretty text-on-surface-variant">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
