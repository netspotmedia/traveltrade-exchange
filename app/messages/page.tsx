import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

type OrderRow = {
  id: string
  title: string
  status: string
  buyer_id: string
  agencies: { name: string } | { name: string }[] | null
  buyer: { email?: string } | { email?: string }[] | null
}

type Msg = { id: string; order_id: string; sender_id: string; body: string; read_at: string | null; created_at: string }

interface Conversation {
  order: OrderRow
  otherParty: string
  latest: Msg | null
  unread: number
}

export default async function MessagesPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [boughtRes, agencyRes] = await Promise.all([
    s.from('orders').select('id, title, status, buyer_id, agencies(name), buyer:profiles(email)').eq('buyer_id', user.id).is('deleted_at', null),
    s.from('agencies').select('id').eq('owner_id', user.id).is('deleted_at', null).maybeSingle(),
  ])

  const agency = agencyRes.data
  const sold = agency
    ? await s.from('orders').select('id, title, status, buyer_id, agencies(name), buyer:profiles(email)').eq('agency_id', agency.id).is('deleted_at', null)
    : null

  const all = [...(boughtRes.data ?? []), ...(sold?.data ?? [])] as OrderRow[]
  const seen = new Set<string>()
  const orders = all.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))

  let conversations: Conversation[] = []
  if (orders.length > 0) {
    const { data: msgs } = await s
      .from('order_messages')
      .select('id, order_id, sender_id, body, read_at, created_at')
      .in('order_id', orders.map((o) => o.id))
      .order('created_at', { ascending: false })

    const byOrder = new Map<string, Msg[]>()
    for (const m of (msgs ?? []) as Msg[]) {
      const list = byOrder.get(m.order_id) ?? []
      list.push(m)
      byOrder.set(m.order_id, list)
    }

    conversations = orders
      .map((o) => {
        const list = byOrder.get(o.id) ?? []
        const isBuyer = user.id === o.buyer_id
        const agency = Array.isArray(o.agencies) ? o.agencies[0] : o.agencies
        const buyer = Array.isArray(o.buyer) ? o.buyer[0] : o.buyer
        const otherParty = isBuyer ? agency?.name || 'Travel partner' : buyer?.email || 'Customer'
        return {
          order: o,
          otherParty,
          latest: list[0] ?? null,
          unread: list.filter((m) => m.sender_id !== user.id && !m.read_at).length,
        }
      })
      .filter((c) => c.latest !== null)
      .sort((a, b) => (b.latest!.created_at > a.latest!.created_at ? 1 : -1))
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Messages</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Conversations</h1>
            <p className="mt-1 text-muted-foreground">
              {totalUnread > 0 ? `${totalUnread} unread across your orders.` : 'Messages with your travel partners, inside each order.'}
            </p>
          </div>
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            All orders <ArrowRight className="size-4" />
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={MessageSquareText}
              title="No conversations yet"
              description="When you message a travel partner inside an order, the conversation will appear here."
              action={
                <Link href="/marketplace">
                  <Button>Find a service</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {conversations.map((c) => (
              <Link
                key={c.order.id}
                href={`/dashboard/orders/${c.order.id}`}
                className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{c.order.title}</h2>
                    <StatusBadge domain="order" status={c.order.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{c.otherParty}</span>
                    {c.latest && <> · {c.latest.body}</>}
                  </p>
                  {c.latest && <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(c.latest.created_at)}</p>}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  {c.unread > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {c.unread}
                    </span>
                  ) : (
                    <MessageSquareText className="size-5 text-muted-foreground" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}