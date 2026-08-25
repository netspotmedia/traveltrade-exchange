import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { VerificationReviewActions } from './verification-review-actions'

type SubmissionRow = {
  id: string
  type: string
  status: string
  submitted_data: Record<string, unknown> | null
  created_at: string
  agencies: { companyName?: string; name?: string } | { companyName?: string; name?: string }[] | null
}

const TYPE_LABELS: Record<string, string> = {
  kyb: 'KYB (business verification)',
  nanta: 'NANTA membership',
  iata: 'IATA certification',
}

export default async function AdminVerificationPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: rows } = await s
    .from('verification_submissions')
    .select('*, agencies(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const list = (rows ?? []) as SubmissionRow[]

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Verification</p>
          <h1 className="mt-2 text-4xl font-semibold">Verification reviews</h1>
          <p className="mt-1 text-muted-foreground">
            {list.length} pending {list.length === 1 ? 'submission' : 'submissions'} to review.
          </p>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No pending submissions"
            description="Agent verification submissions will appear here for review."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {list.map((sub) => {
              const agency = Array.isArray(sub.agencies) ? sub.agencies[0] : sub.agencies
              return (
                <div key={sub.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{agency?.name || 'Agency'}</p>
                      <p className="text-sm text-muted-foreground">
                        {TYPE_LABELS[sub.type] ?? sub.type} · {new Date(sub.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge domain="verification" status={sub.status} />
                  </div>

                  {sub.submitted_data && Object.keys(sub.submitted_data).length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted details</p>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(sub.submitted_data).map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt>
                            <dd className="font-medium">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <VerificationReviewActions submissionId={sub.id} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}