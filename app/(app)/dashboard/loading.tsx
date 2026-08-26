import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <main id="main" className="relative w-full px-4 pb-24 pt-8 md:px-8 md:pt-10 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Skeleton className="h-12 w-64 max-w-full" />
            <Skeleton className="mt-3 h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-12 w-44 rounded-xl" />
        </div>

        {/* KPI bento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>

        {/* Chart panel */}
        <Skeleton className="h-72 rounded-2xl" />

        {/* Trades + activity */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <Skeleton className="h-16 rounded-2xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}