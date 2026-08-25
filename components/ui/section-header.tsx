import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
}

/** Editorial section header — microscopic eyebrow + strong headline + muted
 *  description. Used instead of repetitive "label + big centered H2" blocks. */
export function SectionHeader({ eyebrow, title, description, align = 'left', className }: SectionHeaderProps) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className="font-eyebrow text-primary">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description && (
        <p className={cn('mt-3 text-pretty leading-7 text-muted-foreground', align === 'center' && 'mx-auto max-w-xl')}>
          {description}
        </p>
      )}
    </div>
  )
}