import type { Metadata } from 'next'
import { Mail, MapPin, Clock } from 'lucide-react'
import { getCmsPage } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with TravelTrade Exchange — contact our support team for help with your account, orders or any questions.',
}

const METHODS = [
  { icon: Mail, label: 'Email', value: 'support@traveltradeexchange.com', href: 'mailto:support@traveltradeexchange.com' },
  { icon: Clock, label: 'Response time', value: 'Within 24 hours during business days' },
  { icon: MapPin, label: 'Location', value: 'Serving travellers across Nigeria and beyond' },
]

export default async function ContactPage() {
  const cms = await getCmsPage('contact')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'How can we help?'
  const description =
    typeof hero.description === 'string' ? hero.description : 'Have a question or need assistance? Reach our team and we will get back to you.'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Get in touch</h2>
            {METHODS.map((m) => (
              <div key={m.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <m.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  {m.href ? (
                    <a href={m.href} className="text-sm font-medium text-primary hover:underline">
                      {m.value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium">{m.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Send a message</h2>
            <form
              className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card"
              action="mailto:support@traveltradeexchange.com"
              method="post"
              encType="text/plain"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Name
                <input required name="name" placeholder="Your name" className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Email
                <input required type="email" name="email" placeholder="you@example.com" className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Message
                <textarea required name="message" rows={5} placeholder="Tell us how we can help…" className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" />
              </label>
              <button type="submit" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-card transition hover:opacity-90">
                Send message
              </button>
              <p className="text-center text-xs text-muted-foreground">This opens your email app with the message pre-filled.</p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}