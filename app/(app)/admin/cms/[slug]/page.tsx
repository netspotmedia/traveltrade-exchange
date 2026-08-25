import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CmsEditor } from './cms-editor'
import { PageHeader } from '@/components/dashboard/page-header'

const PAGE_META: Record<string, { title: string; fields: { key: string; label: string; textarea?: boolean }[] }> = {
  landing: {
    title: 'Landing',
    fields: [
      { key: 'badge', label: 'Badge' },
      { key: 'title', label: 'Hero title', textarea: true },
      { key: 'description', label: 'Hero description', textarea: true },
    ],
  },
  'how-it-works': {
    title: 'How It Works',
    fields: [
      { key: 'title', label: 'Hero title', textarea: true },
      { key: 'description', label: 'Hero description', textarea: true },
    ],
  },
  about: {
    title: 'About',
    fields: [
      { key: 'title', label: 'Hero title', textarea: true },
      { key: 'description', label: 'Hero description', textarea: true },
    ],
  },
  contact: {
    title: 'Contact',
    fields: [
      { key: 'title', label: 'Hero title' },
      { key: 'description', label: 'Hero description', textarea: true },
    ],
  },
  help: {
    title: 'Help Center',
    fields: [
      { key: 'title', label: 'Hero title' },
      { key: 'description', label: 'Hero description', textarea: true },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    fields: [{ key: 'title', label: 'Page title' }],
  },
  terms: {
    title: 'Terms of Service',
    fields: [{ key: 'title', label: 'Page title' }],
  },
}

export default async function AdminCmsEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = PAGE_META[slug]
  if (!meta) redirect('/admin/cms')

  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: row } = await s.from('cms_pages').select('slug, title, description, sections, is_published').eq('slug', slug).maybeSingle()

  const sections = (row?.sections ?? {}) as Record<string, Record<string, unknown>>
  const hero = sections.hero ?? {}

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <div className="flex w-full flex-col gap-8">
          <a href="/admin/cms" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
            ← Back to pages
          </a>
          <PageHeader
            title={meta.title}
            description="Edit the hero copy. Publishing makes it live; while unpublished, the built-in defaults are shown to visitors."
          />
          <div className="mt-6">
            <CmsEditor slug={slug} initial={hero as Record<string, string>} isPublished={Boolean(row?.is_published)} fields={meta.fields} />
          </div>
        </div>
      </main>
    </div>
  )
}