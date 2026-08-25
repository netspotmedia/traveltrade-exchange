import Link from 'next/link'
import { ArrowRight, Compass, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate } from '@/lib/format'

type OrderRow = {
  id: string
  title: string
  status: string
  total_amount: number
  currency: string
  created_at: string
  agencies: { name: string } | { name: string }[] | null
}

const ACTIVE = new Set(['proposed', 'funded', 'in_progress', 'delivered', 'disputed'])

export default async function OrdersPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: owned } = await s
    .from('orders')
    .select('*, agencies(name)')
    .eq('buyer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const { data: agency } = await s.from('agencies').select('id').eq('owner_id', user.id).is('deleted_at', null).maybeSingle()
  const { data: sold } = agency
    ? await s.from('orders').select('*, agencies(name)').eq('agency_id', agency.id).is('deleted_at', null).order('created_at', { ascending: false })
    : { data: null }

  const seen = new Set<string>()
  const orders = [...(owned ?? []), ...(sold ?? [])].filter((o) => {
    if (seen.has(o.id)) return false
    seen.add(o.id)
    return true
  }) as OrderRow[]

  const active = orders.filter((o) => ACTIVE.has(o.status))
  const past = orders.filter((o) => !ACTIVE.has(o.status))

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Orders</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your orders</h1>
            <p className="mt-1 text-muted-foreground">Track your agreements and see what needs your attention.</p>
          </div>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Find a service <ArrowRight className="size-4" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="Browse the marketplace and order a service, or request a quote from a verified agent."
              action={
                <Link href="/marketplace">
                  <Button>Browse services</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active</h2>
              <div className="mt-3 flex flex-col gap-3">
                {active.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">Nothing active right now.</p>}
                {active.map((o) => {
                  const agency = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
                  return <OrderCard key={o.id} order={o} agencyName={agency?.name ?? null} />
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past</h2>
              <div className="mt-3 flex flex-col gap-3">
                {past.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">No past orders yet.</p>}
                {past.map((o) => {
                  const agency = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
                  return <OrderCard key={o.id} order={o} agencyName={agency?.name ?? null} />
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function OrderCard({ order, agencyName }: { order: OrderRow; agencyName: string | null }) {
  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{order.title}</h3>
          <StatusBadge domain="order" status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {agencyName || 'Travel partner'} · {formatMoney(order.total_amount, order.currency)} · {formatDate(order.created_at)}
        </p>
      </div>
      <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:inline-flex">
        <Compass className="size-4" /> View order
      </span>
    </Link>
  )
}