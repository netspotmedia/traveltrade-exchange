import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import OrderForm from './order-form'
import { createClient } from '@/lib/supabase/server'

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ service?: string; agency?: string }> }) {
  const params = await searchParams
  const serviceId = params.service ?? null

  // For instant orders, load the service so the buyer sees the correct price
  // and title instead of having to guess the exact amount.
  let serviceMeta: { title: string; basePrice: number; currency: string } | null = null
  if (serviceId) {
    const supabase = await createClient()
    const { data: service } = await supabase
      .from('services')
      .select('id, title, base_price, currency, status, ordering_mode')
      .eq('id', serviceId)
      .is('deleted_at', null)
      .maybeSingle()
    if (service && service.status === 'published' && service.ordering_mode === 'instant_order') {
      serviceMeta = {
        title: service.title,
        basePrice: Number(service.base_price),
        currency: service.currency ?? 'NGN',
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>
        <div className="mt-5">
          <OrderForm serviceId={serviceId} agencyId={params.agency ?? null} serviceMeta={serviceMeta} />
        </div>
      </main>
    </div>
  )
}