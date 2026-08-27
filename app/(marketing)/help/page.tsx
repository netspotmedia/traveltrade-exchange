import Link from 'next/link'
import type { Metadata } from 'next'
import { getCmsPage } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'Help Center',
  description:
    'Get help with TravelTrade Exchange — answers about accounts, payments, escrow, orders and more.',
}

const SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How do I create an account?', a: 'Click Create an account on any page. Verify your email, and you can start finding verified travel professionals right away. Agents must complete business verification before selling.' },
      { q: 'Is registration free?', a: 'Yes. Registration is free for both customers and agents.' },
      { q: 'What is verification?', a: 'Every agent submits business details and a registration document, which our team reviews before their services go live.' },
    ],
  },
  {
    title: 'Payments & Escrow',
    items: [
      { q: 'How does protected payment work?', a: 'When you agree on a plan, your payment is held securely. It is only released to the agent when you approve the delivered work, milestone by milestone.' },
      { q: 'Are there any fees?', a: 'There are no hidden fees. Any platform fees are transparent and communicated before you confirm a payment.' },
      { q: 'Can I get a refund?', a: 'If the agent has not delivered the agreed service, you can raise a dispute. Our team reviews the case and releases funds fairly.' },
    ],
  },
  {
    title: 'Orders & Delivery',
    items: [
      { q: 'How do I place an order?', a: 'Browse the marketplace, then order a service instantly or request a quote. Once you agree, a clear milestone plan is created before anything is funded.' },
      { q: 'What is a milestone?', a: 'A milestone is a specific deliverable within an order. Payment is released per milestone as you approve each one.' },
      { q: 'How do I track my order?', a: 'Open the order in your workspace to see its status, the payment plan, and your messages with the agent. You also get notifications on updates.' },
    ],
  },
  {
    title: 'Selling as an Agent',
    items: [
      { q: 'How do I become a verified agent?', a: 'Submit your business profile and registration document from the Sell travel services page. Our team reviews it before your services go live.' },
      { q: 'How do I list services?', a: 'Once verified, go to My Services in your workspace and create a service. Services are reviewed before appearing on the marketplace.' },
      { q: 'How do I withdraw earnings?', a: 'Go to Wallet in your workspace to see your available balance and request a withdrawal.' },
    ],
  },
]

export default async function HelpPage() {
  const cms = await getCmsPage('help')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'Frequently asked questions'
  const description =
    typeof hero.description === 'string'
      ? hero.description
      : 'Find answers about accounts, payments, escrow and orders. Still stuck? Contact our support team.'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <div className="text-center">
          <p className="font-eyebrow text-primary">Help Center</p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">{description}</p>
        </div>

        <div className="mt-12 flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
              <div className="glass-card mt-4 flex flex-col divide-y divide-border rounded-2xl">
                {section.items.map((item) => (
                  <details key={item.q} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                      {item.q}
                      <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-primary p-8 text-center text-primary-foreground">
          <h2 className="text-xl font-semibold">Still need help?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-primary-foreground/80">
            Our support team typically responds within 24 hours during business days.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all hover:shadow-xl"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  )
}