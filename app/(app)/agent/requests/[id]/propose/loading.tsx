import { Skeleton } from '@/components/ui/skeleton'

export default function ProposeLoading() {
  return (
    <div className="relative w-full px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-[30rem] rounded-3xl" />
    </div>
  )
}