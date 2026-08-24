import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { StatusBadge } from '@/components/ui/status-badge'

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
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Quote requests</p>
          <h1 className="mt-2 text-3xl font-semibold">Incoming requests</h1>
          <p className="mt-2 text-muted-foreground">Respond with a proposal and milestone breakdown.</p>
        </div>
        <div className="flex flex-col gap-4">
          {!orders || orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open quote requests right now.</p>
          ) : (
            (orders as OrderRow[]).map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/40">
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
      </div>
    </main>
  )
}
