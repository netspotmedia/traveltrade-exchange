import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KybReviewActions } from './kyb-review-actions'

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

export default async function AdminPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: pendingAgencies }, { data: pendingServices }, { data: pendingWithdrawals }] = await Promise.all([
    s.from('agencies')
      .select('*, owner:profiles(email), kyc_documents(*)')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true }),
    s.from('services').select('*').eq('status', 'pending'),
    s.from('withdrawals').select('*').eq('status', 'pending'),
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
      </div>
    </main>
  )
}
