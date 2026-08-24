import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KybReviewActions } from './kyb-review-actions'
import { ServiceReviewActions } from './service-review-actions'
import { WithdrawalReviewActions } from './withdrawal-review-actions'
import { DisputeReviewActions } from './dispute-review-actions'

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

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: pendingAgencies }, { data: pendingServices }, { data: pendingWithdrawals }, { data: openDisputes }] = await Promise.all([
    s.from('agencies')
      .select('*, owner:profiles(email), kyc_documents(*)')
      .eq('verification_status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    s.from('services').select('*, agencies(name)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('withdrawals').select('*, seller:profiles(email)').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }),
    s.from('disputes').select('*, order:orders(title)').in('status', ['open', 'under_review']).is('deleted_at', null).order('created_at', { ascending: true }),
  ])

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Operations console</p>
          <h1 className="mt-2 text-4xl font-semibold">Review queue</h1>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Agency KYB', pendingAgencies?.length ?? 0],
            ['Service approvals', pendingServices?.length ?? 0],
            ['Withdrawals', pendingWithdrawals?.length ?? 0],
          ].map(([title, count]) => (
            <section key={title as string} className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">{title as string}</h2>
              <p className="mt-4 text-3xl font-semibold">{count}</p>
              <p className="text-sm text-muted-foreground">Awaiting review</p>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Pending agency KYB</h2>
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
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{a.verification_status}</span>
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
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Pending service approvals</h2>
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
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{svc.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{svc.description}</p>
                    <ServiceReviewActions serviceId={svc.id} />
                  </div>
                )
              })
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Pending withdrawals</h2>
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
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{w.status}</span>
                  </div>
                  <WithdrawalReviewActions withdrawalId={w.id} />
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Open disputes</h2>
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
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{d.status}</span>
                  </div>
                  <DisputeReviewActions disputeId={d.id} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
