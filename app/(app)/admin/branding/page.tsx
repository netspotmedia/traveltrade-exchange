import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandingForm } from './branding-form'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'

const ASSETS = [
  { key: 'logo', label: 'Site logo', description: 'Used in the header, sidebar, footer and auth screens.' },
  { key: 'favicon', label: 'Favicon', description: 'Browser tab icon.' },
  { key: 'og_image', label: 'OG image (social share)', description: 'Preview image when the site is shared.' },
]

export default async function AdminBrandingPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: assets } = await s.from('site_assets').select('key, url, alt, width, height')
  const map = Object.fromEntries((assets ?? []).map((a) => [a.key, a]))

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <div className="flex w-full flex-col gap-8">
          <PageHeader
            title="Brand & assets"
            description="Manage logo, favicon and social-share assets. These are site-wide."
          />

          {ASSETS.map((asset) => (
            <Panel key={asset.key} className="p-6">
              <SectionTitle>{asset.label}</SectionTitle>
              <p className="mt-1 text-sm text-muted-foreground">{asset.description}</p>
              <div className="mt-4">
                <BrandingForm
                  assetKey={asset.key}
                  current={
                    map[asset.key]
                      ? { url: map[asset.key].url, alt: map[asset.key].alt ?? '', width: map[asset.key].width, height: map[asset.key].height }
                      : null
                  }
                />
              </div>
            </Panel>
          ))}
        </div>
      </main>
    </div>
  )
}