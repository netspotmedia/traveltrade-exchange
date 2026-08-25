import { Skeleton } from '@/components/ui/skeleton'

export default function AdminAuditLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </main>
  )
}