import { Skeleton } from '@/components/ui/skeleton'

export default function WalletLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-52 max-w-full" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <Skeleton className="mt-6 h-48 rounded-3xl" />
      <Skeleton className="mt-5 h-40 rounded-3xl" />
      <Skeleton className="mt-5 h-40 rounded-3xl" />
    </div>
  )
}