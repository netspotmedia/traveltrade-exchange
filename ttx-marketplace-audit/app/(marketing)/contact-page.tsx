import type { Metadata } from 'next'
import { Mail, MapPin, Clock } from 'lucide-react'
import { getCmsPage } from '@/lib/cms'
import { ContactForm } from './contact-form'

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
          <p className="font-eyebrow text-primary">Contact</p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-pretty text-muted-foreground">{description}</p>
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
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  )
}