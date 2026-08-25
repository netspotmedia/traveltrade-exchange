import { Skeleton } from '@/components/ui/skeleton'

export default function AgentProposalsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}