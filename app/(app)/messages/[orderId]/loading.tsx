import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationLoading() {
  return (
    <div className="relative w-full px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-56 max-w-full" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="hidden flex-col gap-2 lg:flex">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[26rem] rounded-2xl" />
      </div>
    </div>
  )
}