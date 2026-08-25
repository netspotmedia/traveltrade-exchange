import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const PAGES = [
  { slug: 'landing', title: 'Landing', href: '/' },
  { slug: 'how-it-works', title: 'How It Works', href: '/how-it-works' },
  { slug: 'about', title: 'About', href: '/about' },
  { slug: 'contact', title: 'Contact', href: '/contact' },
  { slug: 'help', title: 'Help Center', href: '/help' },
  { slug: 'privacy', title: 'Privacy Policy', href: '/privacy' },
  { slug: 'terms', title: 'Terms of Service', href: '/terms' },
]

export default async function AdminCmsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: rows } = await s.from('cms_pages').select('slug, is_published')

  const published = new Set<string>()
  if (rows) {
    for (const r of rows) published.add(r.slug)
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Content</p>
          <h1 className="mt-2 text-4xl font-semibold">Marketing pages</h1>
          <p className="mt-1 text-muted-foreground">Edit page copy. Each page falls back to built-in defaults until you publish content.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PAGES.map((p) => {
            const isPublished = published.has(p.slug)
            return (
              <Link
                key={p.slug}
                href={`/admin/cms/${p.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                    <FileText className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{p.title}</span>
                    <span className="block text-sm text-muted-foreground">{p.href}</span>
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isPublished ? 'bg-success/25 text-success-foreground' : 'bg-warning/25 text-warning-foreground'
                  }`}
                >
                  {isPublished ? 'Published' : 'Default'}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}