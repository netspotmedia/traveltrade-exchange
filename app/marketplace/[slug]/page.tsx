import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: service } = await supabase
    .from('services')
    .select('*, agencies(name, slug, verification_status, rating, city)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!service) notFound()

  const isInstant = service.ordering_mode === 'instant_order'
  const ctaHref = isInstant ? `/orders/new?service=${service.id}` : `/requests/new?service=${service.id}`
  const ctaLabel = isInstant ? 'Order now' : 'Request a quote'

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link href="/marketplace" className="text-sm text-muted-foreground">← Back to marketplace</Link>
        <section className="grid gap-8 rounded-3xl border bg-card p-8 md:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{service.category}</span>
            <h1 className="text-4xl font-semibold tracking-tight">{service.title}</h1>
            <p className="leading-7 text-muted-foreground">{service.description}</p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{service.location || 'Nigeria'}</span>
              <span>Verified delivery partner</span>
              <span>{isInstant ? 'Instant order' : 'Quote required'}</span>
            </div>
          </div>
          <aside className="flex flex-col gap-5 rounded-2xl bg-muted/50 p-6">
            <p className="text-sm text-muted-foreground">Starting from</p>
            <p className="text-3xl font-semibold">₦{Number(service.base_price).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {isInstant ? 'Place an order and fund escrow to begin.' : 'Request a quote and agree on milestones before funding.'}
            </p>
            <Link href={ctaHref} className={buttonVariants()}>{ctaLabel}</Link>
          </aside>
        </section>
      </div>
    </main>
  )
}
