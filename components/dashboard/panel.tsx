import { cn } from '@/lib/utils'

/** Machined card surface — 20px radius, hairline border, inset top highlight.
 *  The standard elevated container across dashboard pages. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card surface-soft', className)} {...props} />
}

/** Consistent section title (tight, semibold). */
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold tracking-tight', className)}>{children}</h2>
}

/** Interactive card row — shared hover/press micro-motion for links. */
export const rowMotion =
  'rounded-2xl border border-border bg-card surface-soft transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-soft-lg active:scale-[0.995]'