import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SettingsNav } from '@/components/settings/settings-nav'
import { MfaEnrollment } from './mfa-enrollment'

export default async function SecuritySettingsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 pb-24 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Account security</h1>
          <p className="mt-1 text-muted-foreground">Protect your account and your payments.</p>
        </div>

        <div className="mt-6">
          <SettingsNav active="security" />
        </div>

        <div className="mt-6">
          <MfaEnrollment enforced={process.env.NEXT_PUBLIC_MFA_ENFORCED === 'true'} />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}