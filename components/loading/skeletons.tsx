import { Skeleton } from '@/components/ui/skeleton'

/** Dashboard page skeleton — matches the layout of the redesigned dashboard
 *  with hero, search, activity cards, and content area. */
export function DashboardSkeleton() {
  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-6 md:px-8 md:pt-8 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        {/* Hero */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-5 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>

        {/* Search */}
        <Skeleton className="h-16 rounded-2xl" />

        {/* Activity summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>

        {/* Content area */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>

        {/* Service cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </main>
  )
}

/** Marketplace page skeleton */
export function MarketplaceSkeleton() {
  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-8 md:px-8 md:pt-10 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-5 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  )
}

/** Order detail skeleton */
export function OrderSkeleton() {
  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-8 md:px-8 md:pt-10 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-10 w-80 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </main>
  )
}

/** Service detail skeleton */
export function ServiceDetailSkeleton() {
  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-8 md:px-8 md:pt-10 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-10 w-80 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </main>
  )
}

/** Messages skeleton */
export function MessagesSkeleton() {
  return (
    <main id="main" className="relative flex h-full min-h-[calc(100dvh-4rem)]">
      {/* Sidebar */}
      <div className="hidden w-80 border-r border-border p-4 lg:block">
        <Skeleton className="mb-4 h-8 w-32 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Thread */}
      <div className="flex-1 p-4">
        <Skeleton className="mb-4 h-12 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-3/4 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}
