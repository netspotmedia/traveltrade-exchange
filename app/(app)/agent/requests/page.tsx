import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Inbox } from 'lucide-react'

type OrderRow = {
  id: string
  title: string
  status: string
  created_at: string
  buyer: { email?: string } | null
}

export default async function AgentRequestsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const { data: orders } = await s
    .from('orders')
    .select('*, buyer:profiles(email)')
    .eq('agency_id', agency!.id)
    .eq('status', 'proposed')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Incoming requests"
          description="Respond with a proposal and milestone breakdown."
        />
        <div className="mt-6 flex flex-col gap-4">
          {!orders || orders.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No requests right now"
              description="When a customer requests a quote from your services, it will appear here."
            />
          ) : (
            (orders as OrderRow[]).map((o) => (
              <div key={o.id} className="group flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-card p-5 shadow-soft surface-soft transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/15 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.995]">
                <div className="min-w-0">
                  <p className="font-semibold">{o.title}</p>
                  <p className="text-sm text-muted-foreground">{o.buyer?.email || 'Buyer'} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge domain="order" status={o.status} />
                  <Link
                    href={`/agent/requests/${o.id}/propose`}
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
                  >
                    Submit proposal
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
