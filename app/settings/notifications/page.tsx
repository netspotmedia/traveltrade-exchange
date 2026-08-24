import { SiteHeader } from '@/components/layout/site-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SettingsNav } from '@/components/settings/settings-nav'
import { NotificationPreferences } from './notification-preferences'

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Choose how TravelTrade Exchange reaches you by email.</p>
        </div>

        <div className="mt-6">
          <SettingsNav active="notifications" />
        </div>

        <div className="mt-6">
          <NotificationPreferences />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}