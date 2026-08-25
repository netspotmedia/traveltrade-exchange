import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, CheckCircle2, ChevronRight, FileUp, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuthShell } from '@/components/auth/auth-shell'
import { OnboardingForm } from './onboarding-form'
import { StatusBadge } from '@/components/ui/status-badge'

type SubmissionRow = { id: string; type: string; status: string; rejection_reason: string | null; created_at: string }

const STEP_LABELS: Record<string, string> = {
  kyb: 'Business verification',
  nanta: 'NANTA membership',
  iata: 'IATA certification',
}

export default async function OnboardingPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: agency } = await s.from('agencies').select('id, name, verification_status, verifications').eq('owner_id', user.id).is('deleted_at', null).maybeSingle()

  // No agency yet — begin the journey: capture business info + document.
  if (!agency) {
    return (
      <AuthShell
        title="Let's verify your travel business"
        subtitle="Tell us about your business and attach a registration document. Our team reviews it before you can sell services."
      >
        <OnboardingForm />
      </AuthShell>
    )
  }

  const { data: submissions } = await s
    .from('verification_submissions')
    .select('id, type, status, rejection_reason, created_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = (submissions ?? []) as SubmissionRow[]
  const creds = (agency.verifications ?? []) as string[]

  // Deterministic per-type status across both the canonical submissions and
  // the legacy agency flags so the seller always sees one coherent picture.
  const statusFor = (type: string): string => {
    if (type === 'kyb') return agency.verification_status === 'verified' ? 'approved' : list.some((x) => x.type === 'kyb' && x.status === 'pending') ? 'pending' : 'unverified'
    return creds.includes(type) ? 'approved' : list.some((x) => x.type === type && x.status === 'pending') ? 'pending' : 'unverified'
  }
  const kyb = list.find((x) => x.type === 'kyb')
  const fullyVerified = agency.verification_status === 'verified'
  const kybRejected = kyb?.status === 'rejected'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 pb-24 lg:px-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Seller onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Verification status</h1>
          <p className="mt-2 text-muted-foreground">
            {fullyVerified
              ? 'Your business is verified — you can now list services and trade.'
              : 'Complete the steps below to start trading. Everything is reviewed by our team.'}
          </p>
        </div>

        {/* Status card */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                {fullyVerified ? <BadgeCheck className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <div>
                <p className="font-semibold">{agency.name}</p>
                <p className="text-sm text-muted-foreground">{fullyVerified ? 'Verified business' : 'Verification in progress'}</p>
              </div>
            </div>
            <StatusBadge domain="agency" status={agency.verification_status} />
          </div>

          {kybRejected && kyb?.rejection_reason && (
            <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Your verification was not approved: {kyb.rejection_reason}
            </p>
          )}

          {/* Journey steps */}
          <ol className="mt-6 flex flex-col gap-3">
            {Object.entries(STEP_LABELS).map(([type, label], i) => {
              const status = statusFor(type)
              const done = status === 'approved'
              const current = status === 'pending'
              const failed = status === 'rejected'
              return (
                <li key={type} className="flex items-center gap-3 rounded-2xl border border-border p-4">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                      done ? 'bg-success text-success-foreground' : current ? 'bg-info text-info-foreground' : failed ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {done ? 'Complete' : current ? 'Submitted — in review' : failed ? 'Needs attention' : 'Not started'}
                    </p>
                  </div>
                  <StatusBadge domain="verification" status={status} />
                </li>
              )
            })}
          </ol>

          {/* Next action */}
          <div className="mt-6">
            {fullyVerified ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
              >
                Go to dashboard <ChevronRight className="size-4" />
              </Link>
            ) : (
              <Link
                href="/agent/verification"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
              >
                {kybRejected ? 'Resubmit verification' : 'Continue verification'} <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </section>

        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <FileUp className="size-4" aria-hidden="true" /> Documents are kept private and only reviewed by our team.
        </p>
      </main>
    </div>
  )
}