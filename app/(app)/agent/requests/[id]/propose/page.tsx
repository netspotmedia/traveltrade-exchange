import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { ProposeForm } from './propose-form'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { formatMoney } from '@/lib/format'

type OrderRow = {
  id: string
  agency_id: string
  title: string
  status: string
  total_amount: number
  currency: string
  buyer: { email?: string } | { email?: string }[] | null
}

export default async function ProposePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const { data: order } = await s
    .from('orders')
    .select('id, agency_id, title, status, total_amount, currency, buyer:profiles(email)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) redirect('/agent/requests')
  if (order.agency_id !== agency!.id) redirect('/agent/requests')
  if (order.status !== 'proposed') redirect('/agent/requests')

  const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <Link href="/agent/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to requests
        </Link>

        <div className="mt-5">
          <PageHeader
            title={order.title}
            description={`${buyer?.email || 'Customer'} · ${formatMoney(order.total_amount, order.currency)}`}
            actions={<StatusBadge domain="order" status={order.status} />}
          />
        </div>

        <div className="mt-6">
          <ProposeForm orderId={order.id} />
        </div>
      </main>
    </div>
  )
}