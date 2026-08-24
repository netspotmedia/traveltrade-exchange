import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EscrowActions } from './escrow-actions'
import { MessageThread } from './message-thread'
import { ProposalPanel } from './proposal-panel'

type MilestoneRow = { id: string; title: string; amount: number; status: string }
type ProposalRow = { id: string; fee_amount: number; timeline_days: number | null; note: string | null; status: string; created_at: string }

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: order } = await s
    .from('orders')
    .select('*, services(title), agencies(name, owner_id), milestones(*)')
    .eq('id', id)
    .maybeSingle()
  if (!order) notFound()

  const { data: proposals } = await s
    .from('proposals')
    .select('id, fee_amount, timeline_days, note, status, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const milestones = (order.milestones ?? []) as MilestoneRow[]
  const proposalList = (proposals ?? []) as ProposalRow[]
  const agency = Array.isArray(order.agencies) ? order.agencies[0] : order.agencies
  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === agency?.owner_id

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <p className="text-sm font-semibold text-primary">Protected order</p>
        <div className="rounded-3xl border bg-card p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{order.title}</h1>
              <p className="mt-2 text-muted-foreground">{agency?.name || 'Travel partner'} · ₦{Number(order.total_amount).toLocaleString()}</p>
            </div>
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-sm font-medium">{order.status}</span>
          </div>
          <div className="mt-8 grid gap-3">
            {milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones have been agreed yet.</p>}
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-muted-foreground">₦{Number(m.amount).toLocaleString()}</p>
                </div>
                <span className="text-sm text-muted-foreground">{m.status}</span>
              </div>
            ))}
          </div>
          <EscrowActions orderId={id} orderStatus={order.status} milestones={milestones} isBuyer={isBuyer} isSeller={isSeller} />
        </div>
        <ProposalPanel orderId={id} isBuyer={isBuyer} isSeller={isSeller} proposals={proposalList} />
        <MessageThread orderId={id} currentUserId={user.id} />
      </div>
    </main>
  )
}
