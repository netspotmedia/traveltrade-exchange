import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Lock,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Star,
  Timer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ServiceCard } from '@/components/service-card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VerificationBadges } from '@/components/ui/verification-badges'
import { categoryIcon } from '@/lib/categories'
import { formatMoney, formatNumber, formatResponseTime, formatDate } from '@/lib/format'
import { publicImageUrl } from '@/lib/images'

type Agency = { id: string; name: string; slug: string; verification_status: string; rating: number; city: string | null; completed_orders: number; verifications?: string[] | null }

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  author: { full_name?: string | null } | null
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('*, agencies(id, name, slug, verification_status, rating, city, completed_orders, verifications)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (!service) notFound()

  const agency = (Array.isArray(service.agencies) ? service.agencies[0] : service.agencies) as Agency | undefined
  const isInstant = service.ordering_mode === 'instant_order'
  const Icon = categoryIcon(service.category)
  const rating = Number(agency?.rating ?? 0)
  const verified = agency?.verification_status === 'verified'

  // Related services in the same category (honest recommendation, real data).
  const { data: related } = await supabase
    .from('services')
    .select('*, agencies(name, slug, verification_status, rating, city)')
    .eq('status', 'published')
    .eq('category', service.category)
    .neq('id', service.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  // Real computed response metrics for this agency.
  let responseStats: { avgResponseHours: number | null; responseRate: number | null } | null = null
  if (agency) {
    const { data: stats } = await supabase.rpc('agency_response_stats', { p_agency_id: agency.id })
    const s = stats as { avg_response_hours?: number | null; response_rate?: number | null } | null
    responseStats = { avgResponseHours: s?.avg_response_hours ?? null, responseRate: s?.response_rate ?? null }
  }
  const responseLabel = formatResponseTime(responseStats?.avgResponseHours ?? null)

  // Reviews for this service (public read for published services).
  // Only the reviewer's display name is selected — never email or contact info.
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, author:profiles(full_name)')
    .eq('service_id', service.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviewList = (reviews ?? []) as ReviewRow[]
  const reviewCount = reviewList.length
  const reviewAvg = reviewCount > 0 ? Math.round((reviewList.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount) * 10) / 10 : null

  const images = ((service.images ?? []) as string[]).filter(Boolean)
  const mainImage = images.length > 0 ? publicImageUrl(images[0]) : null
  const details = (service.details ?? null) as { included?: string[]; requirements?: string[]; delivery?: string | null } | null
  const faqs = (service.faqs ?? []) as { question: string; answer: string }[]

  const ctaHref = isInstant ? `/orders/new?service=${service.id}` : `/requests/new?service=${service.id}`
  const ctaLabel = isInstant ? 'Order now' : 'Request a quote'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div className="flex flex-col gap-8">
            {/* Overview */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              {mainImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImage} alt={service.title} className="mb-7 aspect-[16/9] w-full rounded-[1.5rem] border border-border object-cover" />
              )}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-4">
                  <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="size-8" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{service.category}</Badge>
                      {isInstant && <Badge variant="brand" className="bg-primary text-primary-foreground">Instant order</Badge>}
                    </div>
                    <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{service.title}</h1>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                {rating > 0 && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)} rating
                    {reviewCount > 0 && <span className="font-normal text-muted-foreground">({reviewCount} reviews)</span>}
                  </span>
                )}
                {verified && (
                  <span className="flex items-center gap-1.5 text-success-foreground">
                    <BadgeCheck className="size-4" /> Verified agent
                  </span>
                )}
                {(service.location || agency?.city) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {service.location || agency?.city}
                  </span>
                )}
              </div>

              {agency?.verifications?.length ? (
                <div className="mt-4">
                  <VerificationBadges verifications={agency.verifications} />
                </div>
              ) : null}

              <div className="mt-6">
                <h2 className="text-lg font-semibold">About this service</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{service.description || 'No description provided yet.'}</p>
              </div>
            </section>

            {/* What's included / requirements / delivery */}
            {details && (details.included?.length || details.requirements?.length || details.delivery) && (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
                <h2 className="text-lg font-semibold">Service details</h2>
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  {details.included && details.included.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold">What's included</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {details.included.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {details.requirements && details.requirements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold">What you need to provide</h3>
                      <ul className="mt-2 flex flex-col gap-2">
                        {details.requirements.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {details.delivery && (
                    <div className={details.requirements?.length ? 'sm:col-span-2' : ''}>
                      <h3 className="text-sm font-semibold">Delivery expectations</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{details.delivery}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* FAQ */}
            {faqs.length > 0 && (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
                <h2 className="text-lg font-semibold">Frequently asked questions</h2>
                <div className="mt-4 flex flex-col divide-y divide-border">
                  {faqs.map((faq, i) => (
                    <div key={i} className="py-3">
                      <p className="font-medium">{faq.question}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* How ordering works */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <h2 className="text-lg font-semibold">How it works</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {isInstant ? (
                  <>
                    <Step n="1" title="Place your order" body="Order the service at the listed price. You only pay when you confirm the details." />
                    <Step n="2" title="Payment is secured" body="Your payment is held safely and only released when you approve the delivered work." />
                    <Step n="3" title="Track and approve" body="Follow progress, message the agent, and approve delivery when you are satisfied." />
                  </>
                ) : (
                  <>
                    <Step n="1" title="Request a quote" body="Tell the agent your requirement — dates, group size, and what you need." />
                    <Step n="2" title="Agree on milestones" body="The agent sends a proposal with a clear plan and payment milestones." />
                    <Step n="3" title="Pay securely" body="Once you agree, payment is secured and released milestone by milestone." />
                  </>
                )}
              </div>
            </section>

            {/* Secure payment */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Lock className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Your payment is protected</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Money only moves when work is delivered and approved. If you and the agent can't agree, our support team reviews the
                    case and releases funds fairly. Every payment is tracked on one clear record.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Payment secured on order</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Approved before release</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success-foreground" /> Fair dispute support</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Reviews</h2>
                {reviewAvg != null && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {reviewAvg.toFixed(1)}
                    <span className="font-normal text-muted-foreground">· {reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-col divide-y divide-border">
                {reviewList.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No reviews yet. Reviews appear after completed orders.</p>
                ) : (
                  reviewList.map((r) => (
                    <div key={r.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{r.author?.full_name || 'Verified buyer'}</p>
                        <span className="flex items-center gap-1 text-sm text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`size-3.5 ${i < Number(r.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} aria-hidden="true" />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm leading-6 text-muted-foreground">{r.comment}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            {/* Booking panel */}
            <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="mt-1 font-mono text-3xl font-semibold">{formatMoney(service.base_price, service.currency)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isInstant ? 'Order now and secure your booking.' : 'Request a quote — the final plan is agreed before you pay.'}
              </p>
              <Link href={ctaHref} className="mt-5 block">
                <Button size="lg" className="w-full">
                  {ctaLabel}
                </Button>
              </Link>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Verified agent</li>
                <li className="flex items-center gap-2"><Lock className="size-4 text-primary" /> Payment protected</li>
                <li className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" /> Message the agent</li>
              </ul>
            </section>

            {/* Agent preview */}
            {agency && (
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-sm font-semibold text-muted-foreground">Travel professional</h2>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={agency.name} size="lg" />
                  <div className="min-w-0">
                    <Link href={`/agencies/${agency.slug}`} className="truncate font-semibold hover:text-primary hover:underline">
                      {agency.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{agency.city || 'Nigeria'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  {rating > 0 && (
                    <span className="flex items-center gap-2"><Star className="size-4 fill-amber-400 text-amber-400" /> {rating.toFixed(1)} rating</span>
                  )}
                  <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-primary" /> {verified ? 'Verified business' : 'Verification in progress'}</span>
                  {Number(agency.completed_orders) > 0 && (
                    <span className="flex items-center gap-2"><FileText className="size-4 text-primary" /> {formatNumber(agency.completed_orders)} orders completed</span>
                  )}
                  {responseLabel ? (
                    <span className="flex items-center gap-2"><Timer className="size-4 text-primary" /> {responseLabel}</span>
                  ) : (
                    <span className="flex items-center gap-2"><Timer className="size-4 text-primary" /> Replies within the order conversation</span>
                  )}
                  {responseStats?.responseRate != null && (
                    <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-primary" /> Responds to {responseStats.responseRate}% of requests</span>
                  )}
                </div>
                {agency.verifications?.length ? (
                  <div className="mt-4">
                    <VerificationBadges verifications={agency.verifications} />
                  </div>
                ) : null}
                <Link
                  href={`/agencies/${agency.slug}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  View profile
                </Link>
              </section>
            )}
          </aside>
        </div>

        {/* Related services */}
        {related && related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(related as RelatedRow[]).map((s) => {
                const a = Array.isArray(s.agencies) ? s.agencies[0] : s.agencies
                return <ServiceCard key={s.id} service={{ ...s, agencies: a as RelatedRow['agencies'] }} />
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <span className="font-mono text-sm text-primary">{n}</span>
      <h3 className="mt-1 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

type RelatedRow = {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  location: string | null
  base_price: number
  currency: string
  ordering_mode: string | null
  agencies: Agency | Agency[] | null
}