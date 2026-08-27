import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { SubmitServiceAction } from './submit-action'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/dashboard/page-header'
import { Store } from 'lucide-react'

type ServiceRow = { id: string; title: string; category: string; status: string; base_price: number; currency: string }

export default async function AgentServicesPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const { data: services } = await s
    .from('services')
    .select('id, title, category, status, base_price, currency')
    .eq('agency_id', agency!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Manage your services"
          actions={
            <Link href="/agent/services/new" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl">
              New service
            </Link>
          }
        />
        <div className="mt-6 flex flex-col gap-4">
          {!services || services.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No services yet"
              description="Create your first service to start selling to verified travellers."
              action={
                <Link href="/agent/services/new">
                  <Button>Create a service</Button>
                </Link>
              }
            />
          ) : (
            (services as ServiceRow[]).map((svc) => (
              <div key={svc.id} className="group flex flex-wrap items-center justify-between gap-3 glass-card rounded-[1.25rem] p-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/15 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.995]">
                <div>
                  <p className="font-semibold">{svc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {svc.category} · ₦{Number(svc.base_price).toLocaleString()} {svc.currency}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge domain="service" status={svc.status} />
                  {svc.status === 'draft' && <SubmitServiceAction serviceId={svc.id} />}
                  {(svc.status === 'draft' || svc.status === 'rejected') && (
                    <Link href={`/agent/services/${svc.id}/edit`} className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted">
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
