import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'
import { VerificationSubmitForm } from './verification-submit-form'

type SubmissionRow = {
  id: string
  type: string
  status: string
  rejection_reason: string | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  kyb: 'KYB (business verification)',
  nanta: 'NANTA membership',
  iata: 'IATA certification',
}

export default async function AgentVerificationPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: agency } = await s.from('agencies').select('id, verification_status, verifications').eq('owner_id', user.id).is('deleted_at', null).maybeSingle()
  if (!agency) redirect('/onboarding')

  const { data: submissions } = await s
    .from('verification_submissions')
    .select('id, type, status, rejection_reason, created_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = (submissions ?? []) as SubmissionRow[]
  const creds = (agency.verifications ?? []) as string[]
  const pendingTypes = new Set(list.filter((sub) => sub.status === 'pending').map((sub) => sub.type))

  const statusFor = (type: string): string => {
    if (type === 'kyb') return agency.verification_status === 'verified' ? 'approved' : pendingTypes.has('kyb') ? 'pending' : 'unverified'
    return creds.includes(type) ? 'approved' : pendingTypes.has(type) ? 'pending' : 'unverified'
  }

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Agency verification"
          description="Submit documents for KYB, NANTA and IATA. Each is reviewed by our team before it appears on your profile."
        />

        {/* Current status */}
        <Panel className="mt-6 p-6 sm:p-8">
          <SectionTitle>Current status</SectionTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="group rounded-2xl border border-border p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/15 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.995]">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <StatusBadge domain="verification" status={statusFor(type)} className="mt-2" />
              </div>
            ))}
          </div>
        </Panel>

        {/* Submit */}
        <Panel className="mt-5 p-6 sm:p-8">
          <SectionTitle>Submit verification</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">One submission at a time per type. Choose a type and attach a supporting document.</p>
          <div className="mt-4">
            <VerificationSubmitForm pendingTypes={pendingTypes} />
          </div>
        </Panel>

        {/* History */}
{list.length > 0 && (
          <Panel className="mt-5 p-6 sm:p-8">
            <SectionTitle>Submission history</SectionTitle>
            <div className="mt-4 flex flex-col gap-3">
              {list.map((sub) => (
                <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
                  <div>
                    <p className="font-medium">{TYPE_LABELS[sub.type] ?? sub.type}</p>
                    <p className="text-sm text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <p className="mt-1 text-sm text-destructive">{sub.rejection_reason}</p>
                    )}
                  </div>
                  <StatusBadge domain="verification" status={sub.status} />
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>
    </div>
  )
}