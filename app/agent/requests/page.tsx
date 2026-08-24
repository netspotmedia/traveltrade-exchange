import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { StatusBadge } from '@/components/ui/status-badge'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { EmptyState } from '@/components/ui/empty-state'
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
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Quote requests</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Incoming requests</h1>
          <p className="mt-2 text-muted-foreground">Respond with a proposal and milestone breakdown.</p>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          {!orders || orders.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No requests right now"
              description="When a customer requests a quote from your services, it will appear here."
            />
          ) : (
            (orders as OrderRow[]).map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.title}</p>
                    <p className="text-sm text-muted-foreground">{o.buyer?.email || 'Buyer'} · {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge domain="order" status={o.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
