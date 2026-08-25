import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewServiceForm } from './new-service-form'

export default async function NewServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <Link href="/agent/services" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to your services
        </Link>
        <div className="mt-5">
          <NewServiceForm />
        </div>
      </main>
    </div>
  )
}