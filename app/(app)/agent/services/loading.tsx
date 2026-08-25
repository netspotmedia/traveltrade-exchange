import { Skeleton } from '@/components/ui/skeleton'

export default function AgentServicesLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}