import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesInbox, type InboxConversation } from '@/components/messages/inbox'

type OrderRow = {
  id: string
  title: string
  status: string
  buyer_id: string
  agencies: { name: string } | { name: string }[] | null
  buyer: { email?: string } | { email?: string }[] | null
}

type Msg = { id: string; order_id: string; sender_id: string; body: string; read_at: string | null; created_at: string }

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

  let conversations: InboxConversation[] = []
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
          orderId: o.id,
          orderTitle: o.title,
          orderStatus: o.status,
          otherParty,
          latestBody: list[0]?.body ?? null,
          latestAt: list[0]?.created_at ?? null,
          unread: list.filter((m) => m.sender_id !== user.id && !m.read_at).length,
        }
      })
      .filter((c) => c.latestAt !== null)
      .sort((a, b) => ((b.latestAt ?? '') > (a.latestAt ?? '') ? 1 : -1))
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Conversations"
          description={
            totalUnread > 0 ? `${totalUnread} unread across your orders.` : 'Messages with your travel partners, inside each order.'
          }
          actions={
            <Link href="/orders" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              All orders <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          }
        />

        <div className="mt-6">
          <MessagesInbox conversations={conversations} currentUserId={user.id} />
        </div>
      </main>
    </div>
  )
}