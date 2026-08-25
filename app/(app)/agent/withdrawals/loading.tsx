import { Skeleton } from '@/components/ui/skeleton'

export default function WithdrawalsLoading() {
  return (
    <div className="relative w-full px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-40 rounded-3xl" />
      <Skeleton className="mt-5 h-56 rounded-3xl" />
      <Skeleton className="mt-5 h-40 rounded-3xl" />
    </div>
  )
}