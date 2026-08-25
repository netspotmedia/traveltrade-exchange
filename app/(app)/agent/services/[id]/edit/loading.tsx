import { Skeleton } from '@/components/ui/skeleton'

export default function EditServiceLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <div className="mt-5">
        <Skeleton className="h-[32rem] rounded-3xl" />
      </div>
    </div>
  )
}