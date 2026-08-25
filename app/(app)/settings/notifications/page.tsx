import { PageHeader } from '@/components/dashboard/page-header'
import { SettingsNav } from '@/components/settings/settings-nav'
import { NotificationPreferences } from './notification-preferences'

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Notifications"
          description="Choose how TravelTrade Exchange reaches you by email."
        />

        <div className="mt-6">
          <SettingsNav active="notifications" />
        </div>

        <div className="mt-6">
          <NotificationPreferences />
        </div>
      </main>
    </div>
  )
}