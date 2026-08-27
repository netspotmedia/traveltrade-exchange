import { Skeleton } from '@/components/ui/skeleton'

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 md:px-10 md:pt-10 lg:pb-12">
        {/* Header */}
        <div className="mb-12">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="mt-4 h-5 w-96 max-w-full rounded" />
        </div>

        {/* Filter bar */}
        <div className="glass-panel rounded-xl p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-12 flex-grow rounded-lg" />
            <Skeleton className="h-12 w-[200px] rounded-lg" />
            <Skeleton className="h-12 w-[200px] rounded-lg" />
            <Skeleton className="h-12 w-28 rounded-lg" />
          </div>
          <div className="mt-6 flex gap-6 items-end pt-4 border-t border-outline-variant/30">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-48 rounded" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-6 w-64 shrink-0">
            <div className="glass-panel rounded-xl p-6">
              <Skeleton className="h-6 w-40 rounded mb-4" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full rounded" />
                ))}
              </div>
            </div>
            <div className="glass-panel rounded-xl p-6 h-48">
              <Skeleton className="h-6 w-36 rounded mb-2" />
              <Skeleton className="h-4 w-full rounded mb-4" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <Skeleton className="h-4 w-48 rounded mb-6" />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
