'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { appNav, isNavActive, type NavRole, type NavItem } from '@/lib/nav'
import { cn } from '@/lib/utils'

const BUYER_SECTIONS = [
  { label: 'Workspace', items: ['Dashboard', 'Orders', 'Messages', 'Notifications'] },
  { label: 'Money', items: ['Wallet'] },
]

const SELLER_SECTIONS = [
  { label: 'Workspace', items: ['Dashboard', 'Orders', 'Messages', 'Notifications'] },
  { label: 'Business', items: ['My Services', 'Quote Requests', 'Proposals'] },
  { label: 'Account', items: ['Verification', 'Wallet', 'Withdrawals'] },
]

const ADMIN_SECTIONS = [
  { label: 'Overview', items: ['Admin Console'] },
  { label: 'Management', items: ['Users', 'Verification'] },
  { label: 'System', items: ['Email Logs', 'Audit', 'Content', 'Branding'] },
]

function getSections(role: NavRole) {
  switch (role) {
    case 'seller': return SELLER_SECTIONS
    case 'admin': return ADMIN_SECTIONS
    default: return BUYER_SECTIONS
  }
}

/** Role-aware sidebar navigation — grouped sections with headers for better
 *  information architecture. Glass pills with gold active state. */
export function SidebarNav({ role }: { role: NavRole }) {
  const pathname = usePathname()
  const allVisible = appNav.filter((item) => !item.roles || item.roles.includes(role))
  const sections = getSections(role)

  return (
    <nav className="flex flex-col gap-5" aria-label="Sidebar">
      {sections.map((section) => {
        const sectionItems = allVisible.filter((item) => section.items.includes(item.label))
        if (sectionItems.length === 0) return null

        return (
          <div key={section.label}>
            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {sectionItems.map((item) => {
                const active = isNavActive(item, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      active
                        ? 'bg-secondary-container text-on-secondary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
                        : 'text-on-surface-variant hover:bg-white/10 hover:text-primary hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {item.label}
                    {active && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-on-secondary-container/40" />}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
