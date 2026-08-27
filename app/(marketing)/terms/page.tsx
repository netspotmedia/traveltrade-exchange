import type { Metadata } from 'next'
import { getCmsPage } from '@/lib/cms'
import { Reveal } from '@/components/ui/reveal'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'TravelTrade Exchange Terms of Service — the terms that govern your use of the platform.',
}

const SECTIONS = [
  { title: '1. Acceptance of Terms', content: 'By accessing or using TravelTrade Exchange, you agree to be bound by these terms. If you do not agree, please do not use the platform.' },
  { title: '2. Eligibility', content: 'You must be at least 18 years old and capable of entering a binding agreement to use the platform. Agencies must provide accurate business information for verification.' },
  { title: '3. Use of the Platform', content: 'You agree to use the platform only for legitimate travel services and lawful purposes. You may not misuse the platform, attempt to gain unauthorised access, or use it in any way that could harm others.' },
  { title: '4. Orders & Escrow', content: 'When you agree on a plan, your payment is held securely in escrow and only released when you approve the delivered work. Milestone-based release applies to eligible orders.' },
  { title: '5. Verification', content: 'Agents must submit accurate business information and registration documents. We may suspend accounts that provide false information.' },
  { title: '6. Disputes', content: 'If you and the other party cannot agree, you may raise a dispute. Our team reviews the evidence and releases funds fairly.' },
  { title: '7. Limitation of Liability', content: 'To the maximum extent permitted by law, TravelTrade Exchange is not liable for indirect, incidental, or consequential damages arising from your use of the platform.' },
  { title: '8. Changes to These Terms', content: 'We may update these terms from time to time. Significant changes will be posted on this page.' },
]

export default async function TermsPage() {
  const cms = await getCmsPage('terms')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'Terms of Service'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <Reveal>
        <p className="font-eyebrow text-primary">Legal</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">The terms that govern your use of TravelTrade Exchange.</p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section, i) => (
            <Reveal key={section.title} delay={i * 40}>
            <section>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.content}</p>
            </section>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  )
}