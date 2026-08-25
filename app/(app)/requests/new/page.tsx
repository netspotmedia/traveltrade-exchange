import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { RequestForm } from './request-form'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>
        <div className="mt-5">
          <RequestForm serviceId={params.service ?? ''} />
        </div>
      </main>
    </div>
  )
}