import { Skeleton } from '@/components/ui/skeleton'

export default function OrderDetailLoading() {
  return (
    <div className="relative w-full px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="mt-5 h-40 rounded-3xl" />
      <Skeleton className="mt-5 h-52 rounded-3xl" />
      <Skeleton className="mt-5 h-64 rounded-3xl" />
    </div>
  )
}