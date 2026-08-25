import { Skeleton } from '@/components/ui/skeleton'

export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <Skeleton className="mt-6 h-64 rounded-3xl" />
    </div>
  )
}