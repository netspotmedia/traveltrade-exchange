import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/dashboard/page-header'
import { FileText } from 'lucide-react'

type ProposalRow = {
  id: string
  fee_amount: number
  timeline_days: number | null
  note: string | null
  status: string
  created_at: string
  orders: { title: string; id: string } | { title: string; id: string }[] | null
}

export default async function AgentProposalsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const { data: proposals } = await s
    .from('proposals')
    .select('*, orders(title, id)')
    .eq('agency_id', agency!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = (proposals ?? []) as ProposalRow[]

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="My proposals"
          description="Offers you&apos;ve submitted in response to customer requests."
        />

        <div className="mt-6">
          {list.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals yet"
              description="When a customer requests a quote from your services, your proposals will appear here."
              action={
                <Link href="/agent/requests">
                  <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                    View quote requests
                  </button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {list.map((p) => {
                const order = Array.isArray(p.orders) ? p.orders[0] : p.orders
                return (
                  <Link
                    key={p.id}
                    href={order ? `/dashboard/orders/${order.id}` : '/agent/requests'}
                    className="group rounded-[1.25rem] border border-border bg-card p-5 shadow-soft surface-soft transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/15 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.995]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{order?.title || 'Service request'}</p>
                        <p className="mt-1 font-mono text-lg font-semibold">{formatMoney(p.fee_amount)}</p>
                        {p.timeline_days ? <p className="mt-0.5 text-sm text-muted-foreground">{p.timeline_days} days</p> : null}
                        {p.note && <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>}
                      </div>
                      <StatusBadge domain="proposal" status={p.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}