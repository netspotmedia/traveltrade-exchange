import { Skeleton } from '@/components/ui/skeleton'

// Global page-loading state: an on-brand skeleton so navigation never feels dead.
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="hidden gap-2 md:flex">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="size-10 rounded-xl md:hidden" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}