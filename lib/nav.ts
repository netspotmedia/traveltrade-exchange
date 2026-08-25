import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Bell,
  FileText,
  Inbox,
  LayoutGrid,
  MessageSquareText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  WalletCards,
} from 'lucide-react'

export type NavRole = 'buyer' | 'seller' | 'admin'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles?: NavRole[]
  exact?: boolean
}

/** Role-aware navigation for the authenticated app shell. */
export const appNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, exact: true },
  { label: 'Marketplace', href: '/marketplace', icon: Search },
  { label: 'Messages', href: '/messages', icon: MessageSquareText },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Wallet', href: '/dashboard/wallet', icon: WalletCards, roles: ['buyer'] },
  { label: 'My Services', href: '/agent/services', icon: Store, roles: ['seller'] },
  { label: 'Quote Requests', href: '/agent/requests', icon: Inbox, roles: ['seller'] },
  { label: 'Proposals', href: '/agent/proposals', icon: FileText, roles: ['seller'] },
  { label: 'Verification', href: '/agent/verification', icon: ShieldCheck, roles: ['seller'] },
  { label: 'Wallet', href: '/dashboard/wallet', icon: WalletCards, roles: ['seller'] },
  { label: 'Withdrawals', href: '/agent/withdrawals', icon: WalletCards, roles: ['seller'] },
  { label: 'Admin Console', href: '/admin', icon: ShieldCheck, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: FileText, roles: ['admin'] },
  { label: 'Verification', href: '/admin/verification', icon: BadgeCheck, roles: ['admin'] },
  { label: 'Email Logs', href: '/admin/email-logs', icon: MessageSquareText, roles: ['admin'] },
  { label: 'Audit', href: '/admin/audit', icon: FileText, roles: ['admin'] },
  { label: 'Content', href: '/admin/cms', icon: FileText, roles: ['admin'] },
  { label: 'Branding', href: '/admin/branding', icon: FileText, roles: ['admin'] },
]

/** Active state for a nav item based on the current path. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** Five-slot mobile bottom navigation per role. */
export function mobileNavForRole(role: NavRole): NavItem[] {
  switch (role) {
    case 'seller':
      return [
        { label: 'Home', href: '/dashboard', icon: LayoutGrid, exact: true },
        { label: 'Services', href: '/agent/services', icon: Store },
        { label: 'Orders', href: '/orders', icon: ShoppingBag },
        { label: 'Messages', href: '/messages', icon: MessageSquareText },
        { label: 'Wallet', href: '/dashboard/wallet', icon: WalletCards },
      ]
    case 'admin':
      return [
        { label: 'Home', href: '/dashboard', icon: LayoutGrid, exact: true },
        { label: 'Console', href: '/admin', icon: ShieldCheck },
        { label: 'Orders', href: '/orders', icon: ShoppingBag },
        { label: 'Messages', href: '/messages', icon: MessageSquareText },
        { label: 'Alerts', href: '/dashboard/notifications', icon: Bell },
      ]
    default:
      return [
        { label: 'Home', href: '/dashboard', icon: LayoutGrid, exact: true },
        { label: 'Find', href: '/marketplace', icon: Search },
        { label: 'Orders', href: '/orders', icon: ShoppingBag },
        { label: 'Messages', href: '/messages', icon: MessageSquareText },
        { label: 'Wallet', href: '/dashboard/wallet', icon: WalletCards },
      ]
  }
}