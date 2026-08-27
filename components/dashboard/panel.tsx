import { cn } from '@/lib/utils'

/** Machined glass surface — translucent white, backdrop blur, inset highlights.
 *  The standard elevated container across all pages. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-panel rounded-2xl', className)} {...props} />
}

/** Consistent section title (serif, tight, semibold). */
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('font-display text-lg font-semibold tracking-tight text-primary', className)}>{children}</h2>
}

/** Interactive card row — glass hover/press micro-motion for links. */
export const rowMotion =
  'glass-card rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.995]'
