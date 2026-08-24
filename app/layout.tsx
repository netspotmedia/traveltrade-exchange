import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TravelTrade Exchange — Trusted travel services',
  description: 'Find verified travel partners, agree on clear milestones, and keep every naira protected until delivery.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6f8f7',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
