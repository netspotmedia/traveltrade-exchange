import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandingForm } from './branding-form'

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
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Branding</p>
          <h1 className="mt-2 text-4xl font-semibold">Brand & assets</h1>
          <p className="mt-1 text-muted-foreground">Manage logo, favicon and social-share assets. These are site-wide.</p>
        </div>

        {ASSETS.map((asset) => (
          <div key={asset.key} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">{asset.label}</h2>
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
          </div>
        ))}
      </div>
    </main>
  )
}