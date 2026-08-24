import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { SubmitServiceAction } from './submit-action'
import { StatusBadge } from '@/components/ui/status-badge'

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
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Your services</p>
            <h1 className="mt-2 text-3xl font-semibold">Manage your services</h1>
          </div>
          <Link href="/agent/services/new" className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            New service
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          {!services || services.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no services yet. Create your first one.</p>
          ) : (
            (services as ServiceRow[]).map((svc) => (
              <div key={svc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
                <div>
                  <p className="font-semibold">{svc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {svc.category} · ₦{Number(svc.base_price).toLocaleString()} {svc.currency}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge domain="service" status={svc.status} />
                  {svc.status === 'draft' && <SubmitServiceAction serviceId={svc.id} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
