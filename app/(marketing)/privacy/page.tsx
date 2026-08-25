import type { Metadata } from 'next'
import { getCmsPage } from '@/lib/cms'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'TravelTrade Exchange Privacy Policy — learn how we collect, use and protect your personal information.',
}

const SECTIONS = [
  { title: '1. Information We Collect', content: 'We collect information you provide directly: account registration details (name, email), agency business information (company name and registration documents), payment information processed securely, and communications you send us.' },
  { title: '2. How We Use Your Information', content: 'We use your information to provide and operate the platform, process transactions and manage escrow, verify agencies, communicate about orders and account activity, and comply with legal obligations.' },
  { title: '3. Information Sharing', content: 'We share information only as necessary to operate the platform: with the counterparty in a transaction, with payment providers to process payments, and when required by law. We do not sell your personal information.' },
  { title: '4. Data Security', content: 'We implement industry-standard security measures including encryption in transit, secure authentication, and restricted access to sensitive data.' },
  { title: '5. Data Retention', content: 'We retain your information for as long as your account is active or as needed to provide services. Transaction records are retained for financial compliance.' },
  { title: '6. Your Rights', content: 'You have the right to access, correct, request deletion of, and export your personal information. To exercise these rights, contact us using the details on our contact page.' },
  { title: '7. Contact', content: 'For privacy-related questions, contact us via our contact page.' },
]

export default async function PrivacyPage() {
  const cms = await getCmsPage('privacy')
  const hero = cms?.sections.find((s) => s.key === 'hero')?.content ?? {}
  const title = typeof hero.title === 'string' ? hero.title : 'Privacy Policy'

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <p className="font-eyebrow text-primary">Legal</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">How TravelTrade Exchange collects, uses and protects your information.</p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.content}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}