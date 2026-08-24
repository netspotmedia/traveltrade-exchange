import Link from 'next/link'
import { ArrowLeft, MapPin, Search, ShieldCheck, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type ServiceRow = {
  id: string
  title: string
  slug: string
  category: string
  description: string
  location: string | null
  base_price: number
  currency: string
  agencies: { name: string; verification_status: string; rating: number } | { name: string; verification_status: string; rating: number }[] | null
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const category = (params.category ?? '').trim()
  const supabase = await createClient()

  let query = supabase
    .from('services')
    .select('*, agencies(name, verification_status, rating)')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (q) query = query.ilike('title', `%${q}%`)

  const { data: services } = await query
  const list = (services ?? []) as ServiceRow[]

  const { data: categories } = await supabase.from('services').select('category').eq('status', 'published').is('deleted_at', null)

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-primary">
            <ArrowLeft className="size-4" /> TTX MARKETPLACE
          </a>
          <a href="/dashboard" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Open workspace
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Verified marketplace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find the right partner for the journey.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">Compare vetted travel services, then move into a protected agreement with clear milestones.</p>
        </div>

        <form method="get" className="mt-8 flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Search marketplace</span>
            <input
              name="q"
              defaultValue={q}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search visas, flights, hotels, destinations..."
            />
          </label>
          <select
            name="category"
            defaultValue={category}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <option value="">All categories</option>
            {(categories ?? [])
              .map((c) => c.category as string)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
          <button type="submit" className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Search
          </button>
        </form>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{list.length} services available</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" /> All partners verified
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.length === 0 && <p className="text-sm text-muted-foreground">No services match your search.</p>}
          {list.map((service) => {
            const agency = Array.isArray(service.agencies) ? service.agencies[0] : service.agencies
            return (
              <Link
                key={service.id}
                href={`/marketplace/${service.slug}`}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    {service.category}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="size-4 fill-primary text-primary" />
                    {Number(agency?.rating ?? 0).toFixed(1)}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-tight">{service.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{service.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{service.location || 'Nigeria'}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {agency?.name || 'Verified agency'}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  ₦{Number(service.base_price).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">from</span>
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
