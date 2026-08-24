import Link from 'next/link'
import { BadgeCheck, Compass, ListChecks, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TRUST_POINTS = [
  { icon: BadgeCheck, title: 'Verified agents', body: 'Every travel professional is reviewed before their services go live.' },
  { icon: Lock, title: 'Protected payments', body: 'Money is held securely and only released when you approve the work.' },
  { icon: ListChecks, title: 'Clear milestones', body: 'Agree the plan up front — proposals, delivery and payment on one record.' },
]

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-5 py-8 sm:px-8 lg:px-14">
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="TravelTrade Exchange home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card" aria-hidden="true">
            <Compass className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">TravelTrade</span>
            <span className="block text-sm font-semibold tracking-tight text-foreground">Exchange</span>
          </span>
        </Link>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className={cn('mx-auto w-full max-w-md', className)}>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>

        {footer && <div className="mx-auto w-full max-w-md">{footer}</div>}
      </div>

      {/* Trust panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_85%_-10%,rgb(255_255_255/0.14),transparent)]" aria-hidden="true" />
        <div className="relative">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">TravelTrade Exchange</p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight text-primary-foreground">
            A safer way to move travel work forward.
          </h2>
          <div className="mt-10 flex flex-col gap-6">
            {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-foreground/15 text-primary-foreground" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-primary-foreground">{title}</p>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-primary-foreground/75">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}