import { Skeleton } from '@/components/ui/skeleton'

export default function NewRequestLoading() {
  return (
    <div className="relative w-full px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-20" />
      <div className="mt-5">
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  )
}