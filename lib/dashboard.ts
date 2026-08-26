import type { LucideIcon } from 'lucide-react'
import {
  BedDouble,
  BriefcaseBusiness,
  Globe2,
  Map,
  Plane,
  Ship,
  Stamp,
  Truck,
} from 'lucide-react'

/** Serialisable trade row for the interactive Active Trades panel. */
export interface TradeRow {
  id: string
  title: string
  status: string
  amount: number
  currency: string
  partner: string
  createdAt: string
  needsAttention: boolean
  hint: string
}

/** The four milestone stages shown on every trade progress bar. */
export const TRADE_STAGES = ['Agreement', 'Escrow', 'Delivery', 'Done'] as const

const STAGE_INDEX: Record<string, number> = {
  proposed: 1,
  funded: 2,
  in_progress: 3,
  delivered: 4,
  disputed: 2,
  cancelled: 0,
}

/** Which milestone a backend status has reached (1–4). */
export function stageFor(status: string | null | undefined): number {
  if (!status) return 0
  return STAGE_INDEX[status] ?? 0
}

/** Fill fraction for the progress bar (0–1). */
export function stageFraction(status: string | null | undefined): number {
  return stageFor(status) / TRADE_STAGES.length
}

const ICON_PATTERNS: Array<{ re: RegExp; icon: LucideIcon }> = [
  { re: /(avia|flight|airline|ticket)/i, icon: Plane },
  { re: /(maritime|sea|shipping|vessel|boat|cargo|ocean)/i, icon: Ship },
  { re: /(freight|truck|logistic|ground|road|rail)/i, icon: Truck },
  { re: /(hotel|stay|lodge|resort|accommodation)/i, icon: BedDouble },
  { re: /(visa|immigration|entry|permit)/i, icon: Stamp },
  { re: /(tour|guide|itinerary|experience|safari)/i, icon: Map },
  { re: /(delegat|corporate|travel|conference|retreat)/i, icon: BriefcaseBusiness },
]

/** A stable, content-derived icon for a trade based on its title. */
export function tradeIcon(title: string | null | undefined): LucideIcon {
  for (const { re, icon } of ICON_PATTERNS) {
    if (re.test(title ?? '')) return icon
  }
  return Globe2
}

/** Compact currency label for chart axes and mini values (₦1.2m, ₦450k). */
export function compactMoney(value: number, currency?: string | null): string {
  const prefix = !currency || currency === 'NGN' ? '₦' : `${currency} `
  const v = Number(value)
  if (!Number.isFinite(v)) return `${prefix}0`
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (abs >= 1_000) return `${prefix}${Math.round(v / 1_000)}k`
  return `${prefix}${Math.round(v)}`
}

/** Bucket order amounts into the last N calendar months (ending this month). */
export function monthlyBuckets(orders: Array<{ created_at: string | null; total_amount: number | null }>, months = 12): { label: string; value: number }[] {
  const now = new Date()
  const out: { label: string; value: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), value: 0 })
  }
  for (const o of orders) {
    const d = new Date(o.created_at ?? '')
    if (Number.isNaN(d.getTime())) continue
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    if (diff >= 0 && diff < months) {
      out[months - 1 - diff].value += Number(o.total_amount ?? 0)
    }
  }
  return out
}

/** Account standing score from real signals (disputes, open action items). */
export function securityScore(disputedCount: number, attentionCount: number): number {
  const score = 100 - disputedCount * 12 - Math.min(attentionCount * 3, 12)
  return Math.max(70, Math.min(100, Math.round(score)))
}

export function standingLabel(score: number): string {
  if (score >= 95) return 'Excellent standing'
  if (score >= 85) return 'Good standing'
  if (score >= 75) return 'Solid standing'
  return 'Needs attention'
}

/** Relative timestamp label ("Just now", "2 hr ago", "Oct 12, 2023"). */
export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  if (diff < 86_400_000 * 7) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Month-over-month change as a signed percentage (null when undefined). */
export function monthDelta(buckets: { value: number }[]): number | null {
  const current = buckets[buckets.length - 1]?.value ?? 0
  const previous = buckets[buckets.length - 2]?.value ?? 0
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}