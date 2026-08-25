import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KybReviewActions } from './kyb-review-actions'
import { ServiceReviewActions } from './service-review-actions'
import { WithdrawalReviewActions } from './withdrawal-review-actions'
import { DisputeReviewActions } from './dispute-review-actions'
import { FailedCallbackActions } from './failed-callback-actions'
import { RefundReviewActions } from './refund-review-actions'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'

type AgencyRow = {
  id: string
  name: string
  slug: string
  country: string
  city: string | null
  verification_status: string
  created_at: string
  owner: { email?: string } | null
  kyc_documents: { id: string; document_type: string; status: string; created_at: string }[]
}

type ServiceRow = {
  id: string
  title: string
  category: string
  description: string
  base_price: number
  currency: string
  status: string
  created_at: string
  agencies: { name: string } | { name: string }[] | null
}

type WithdrawalRow = {
  id: string
  amount: number
  currency: string
  status: string
  bank_name: string | null
  account_name: string | null
  created_at: string
  seller: { email?: string } | null
}

type DisputeRow = {
  id: string
  reason: string
  status: string
  created_at: string
  order: { title: string } | null
}

type RefundRow = {
  id: string
  amount: number
  reason: string | null
  status: string
  created_at: string
  requester: { email?: string } | null
  order: { title: string } | null
}

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: pendingAgencies },
    { data: pendingServices },
    { data: pendingWithdrawals },
    { data: openDisputes },
    { data: kpis },
    { data: summary },
    { data: emailLogs },
    { data: failedCallbacks },
    { data: pendingRefunds },
  ] = await Promise.all([
    s.from('agencies')
      .select('*, owner:profiles(email), kyc_documents(*)')
      .eq('verification_status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    s.from('services').select('*, agencies(name)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('withdrawals').select('*, seller:profiles(email)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('disputes').select('*, order:orders(title)').in('status', ['open', 'under_review']).is('deleted_at', null).order('created_at', { ascending: true }),
    s.rpc('admin_get_kpis'),
    s.rpc('admin_get_summary'),
    s.rpc('admin_get_email_logs', { p_limit: 50 }),
    s.rpc('admin_get_failed_callbacks', { p_limit: 50 }),
    s.from('refund_requests').select('*, requester:profiles(email), order:orders(title)').eq('status', 'pending').order('created_at', { ascending: true }),
  ])

  const kpi = kpis as { escrow_held?: number; fees_collected?: number; active_orders?: number; verified_agencies?: number; published_services?: number; total_users?: number } | null
  const summ = summary as { pending_withdrawals?: number; open_disputes?: number; failed_emails?: number } | null
  const logs = (emailLogs ?? []) as { id: string; recipient: string; subject: string; provider: string; status: string; attempts: number; error: string | null; created_at: string }[]
  const callbacks = (failedCallbacks ?? []) as { id: string; reference: string; reason: string | null; amount: number | null; currency: string | null; status: string; retry_count: number; created_at: string }[]

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <div className="flex w-full flex-col gap-8">
          <PageHeader title="Overview" />

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['Escrow held', kpi?.escrow_held ?? 0, '₦'],
              ['Fees collected', kpi?.fees_collected ?? 0, '₦'],
              ['Active orders', kpi?.active_orders ?? 0, ''],
              ['Verified agencies', kpi?.verified_agencies ?? 0, ''],
              ['Published services', kpi?.published_services ?? 0, ''],
              ['Total users', kpi?.total_users ?? 0, ''],
            ].map(([title, value, prefix]) => (
              <Panel key={title as string} className="p-5">
                <h2 className="text-sm font-medium text-muted-foreground">{title as string}</h2>
                <p className="mt-3 font-mono text-2xl font-semibold">{prefix}{Number(value).toLocaleString()}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Agency KYB', pendingAgencies?.length ?? 0],
              ['Service approvals', pendingServices?.length ?? 0],
              ['Withdrawals', pendingWithdrawals?.length ?? 0],
            ].map(([title, count]) => (
              <Panel key={title as string} className="p-5">
                <h2 className="font-semibold">{title as string}</h2>
                <p className="mt-4 font-mono text-3xl font-semibold">{count}</p>
                <p className="text-sm text-muted-foreground">Awaiting review</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Panel className="p-5">
              <h2 className="font-semibold">Pending withdrawals</h2>
              <p className="mt-4 text-3xl font-semibold">{summ?.pending_withdrawals ?? 0}</p>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold">Open disputes</h2>
              <p className="mt-4 text-3xl font-semibold">{summ?.open_disputes ?? 0}</p>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-semibold">Failed emails</h2>
              <p className="mt-4 text-3xl font-semibold">{summ?.failed_emails ?? 0}</p>
            </Panel>
          </div>

        <Panel className="p-6">
          <SectionTitle>Pending agency KYB</SectionTitle>
          <div className="mt-4 flex flex-col gap-4">
            {!pendingAgencies || pendingAgencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agencies awaiting verification.</p>
            ) : (
              (pendingAgencies as AgencyRow[]).map((a) => (
                <div key={a.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.city || '—'}, {a.country} · {a.owner?.email || 'no email'}
                      </p>
                    </div>
                    <StatusBadge domain="agency" status={a.verification_status} />
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                    {(a.kyc_documents ?? []).length === 0 && <p>No documents submitted.</p>}
                    {a.kyc_documents.map((d) => (
                      <span key={d.id}>
                        {d.document_type} · {d.status}
                      </span>
                    ))}
                  </div>
                  <KybReviewActions agencyId={a.id} />
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Pending service approvals</SectionTitle>
          <div className="mt-4 flex flex-col gap-4">
            {!pendingServices || pendingServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services awaiting moderation.</p>
            ) : (
              (pendingServices as ServiceRow[]).map((svc) => {
                const agency = Array.isArray(svc.agencies) ? svc.agencies[0] : svc.agencies
                return (
                  <div key={svc.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{svc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {agency?.name || 'Unknown agency'} · {svc.category} · ₦{Number(svc.base_price).toLocaleString()} {svc.currency}
                        </p>
                      </div>
                      <StatusBadge domain="service" status={svc.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{svc.description}</p>
                    <ServiceReviewActions serviceId={svc.id} />
                  </div>
                )
              })
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Pending withdrawals</SectionTitle>
          <div className="mt-4 flex flex-col gap-4">
            {!pendingWithdrawals || pendingWithdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawals awaiting processing.</p>
            ) : (
              (pendingWithdrawals as WithdrawalRow[]).map((w) => (
                <div key={w.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">₦{Number(w.amount).toLocaleString()} {w.currency}</p>
                      <p className="text-sm text-muted-foreground">
                        {w.bank_name || 'Unknown bank'} · {w.account_name || 'Unknown name'} · {w.seller?.email || 'no email'}
                      </p>
                    </div>
                    <StatusBadge domain="withdrawal" status={w.status} />
                  </div>
                  <WithdrawalReviewActions withdrawalId={w.id} />
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Open disputes</SectionTitle>
          <div className="mt-4 flex flex-col gap-4">
            {!openDisputes || openDisputes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open disputes.</p>
            ) : (
              (openDisputes as DisputeRow[]).map((d) => (
                <div key={d.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.order?.title || 'Order dispute'}</p>
                      <p className="text-sm text-muted-foreground">{d.reason}</p>
                    </div>
                    <StatusBadge domain="dispute" status={d.status} />
                  </div>
                  <DisputeReviewActions disputeId={d.id} />
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Pending refunds</SectionTitle>
          <div className="mt-4 flex flex-col gap-4">
            {!pendingRefunds || (pendingRefunds as RefundRow[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">No refund requests awaiting review.</p>
            ) : (
              (pendingRefunds as RefundRow[]).map((r) => (
                <div key={r.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">₦{Number(r.amount).toLocaleString()} {r.order?.title || 'Order refund'}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.requester?.email || 'No email'} · {new Date(r.created_at).toLocaleString()}
                      </p>
                      {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                    </div>
                    <StatusBadge domain="refund" status={r.status} />
                  </div>
                  <RefundReviewActions refundId={r.id} />
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Recent email activity</SectionTitle>
          <div className="mt-4 flex flex-col gap-2">
            {!logs || logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email activity yet.</p>
            ) : (
              logs.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.recipient} · {e.provider} · attempts {e.attempts}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${e.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : e.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-secondary text-secondary-foreground'}`}>
                      {e.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel className="p-6">
          <SectionTitle>Failed payment callbacks</SectionTitle>
          <div className="mt-4 flex flex-col gap-2">
            {!callbacks || callbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unresolved payment callbacks.</p>
            ) : (
              callbacks.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.reference}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.reason || 'No reason'} {c.amount ? ` · ₦${Number(c.amount).toLocaleString()} ${c.currency ?? ''}` : ''} · retries {c.retry_count}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-secondary-foreground'}`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                    <FailedCallbackActions callbackId={c.id} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
        </div>
      </main>
    </div>
  )
}
