import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import OrderForm from './order-form'

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ service?: string; agency?: string }> }) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 pb-24 lg:px-8">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>
        <div className="mt-5">
          <OrderForm serviceId={params.service ?? null} agencyId={params.agency ?? null} />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}