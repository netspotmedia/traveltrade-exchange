import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { PageHeader } from '@/components/dashboard/page-header'
import { SettingsNav } from '@/components/settings/settings-nav'
import { MfaEnrollment } from './mfa-enrollment'

export default async function SecuritySettingsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <Reveal>
        <PageHeader
          title="Account security"
          description="Protect your account and your payments."
        />
        </Reveal>

        <Reveal>
        <div className="mt-6">
          <SettingsNav active="security" />
        </div>
        </Reveal>

        <Reveal>
        <div className="mt-6">
          <MfaEnrollment enforced={process.env.NEXT_PUBLIC_MFA_ENFORCED === 'true'} />
        </div>
        </Reveal>
      </main>
    </div>
  )
}