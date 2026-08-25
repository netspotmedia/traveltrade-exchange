import { Skeleton } from '@/components/ui/skeleton'

export default function AdminEmailLogsLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="flex w-full flex-col gap-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </main>
  )
}