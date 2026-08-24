import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type OrderRow = {
  id: string
  title: string
  status: string
  total_amount: number
  currency: string
  created_at: string
  agencies: { name: string } | { name: string }[] | null
}

export default async function OrdersPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  // Orders where the user is the buyer, or the fulfilling agency owner.
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
  })

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Orders</p>
            <h1 className="mt-2 text-3xl font-semibold">Your orders & proposals</h1>
          </div>
          <Link href="/marketplace" className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Browse marketplace
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no orders yet. Browse the marketplace to get started.</p>
          ) : (
            orders.map((o) => {
              const agency = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
              return (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{o.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {agency?.name || 'Travel partner'} · ₦{Number(o.total_amount).toLocaleString()} {o.currency}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{o.status}</span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
