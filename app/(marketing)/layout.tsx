import { SiteHeader } from '@/components/layout/site-header'
import { Footer } from '@/components/layout/footer'

/** Public marketing pages: shared header + footer (adopted from TTX Next). */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader overlay />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}