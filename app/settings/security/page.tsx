import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MfaEnrollment } from './mfa-enrollment'

export default async function SecuritySettingsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Security</p>
          <h1 className="mt-2 text-3xl font-semibold">Account security</h1>
        </div>
        <MfaEnrollment enforced={process.env.NEXT_PUBLIC_MFA_ENFORCED === 'true'} />
      </div>
    </main>
  )
}
