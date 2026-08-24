import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { EditServiceForm } from './edit-service-form'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const { data: service } = await s
    .from('services')
    .select('id, title, slug, category, description, location, base_price, images, details, status, agency_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!service || service.agency_id !== agency!.id) notFound()
  if (!['draft', 'rejected'].includes(service.status)) redirect('/agent/services')

  const details = (service.details ?? null) as { included?: string[]; requirements?: string[]; delivery?: string | null } | null

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <Link href="/agent/services" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to your services
        </Link>
        <div className="mt-5">
          <EditServiceForm
            service={{
              id: service.id,
              title: service.title,
              category: service.category,
              description: service.description,
              location: service.location,
              base_price: Number(service.base_price),
              images: (service.images ?? []) as string[],
              details: {
                included: details?.included ?? [],
                requirements: details?.requirements ?? [],
                delivery: details?.delivery ?? null,
              },
            }}
          />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}