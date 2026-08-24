const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

const date = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatMoney(amount: number | string | null | undefined, currency?: string | null): string {
  const value = Number(amount ?? 0)
  if (!Number.isFinite(value)) return '—'
  if (!currency || currency === 'NGN') return naira.format(value)
  return `${currency} ${number.format(value)}`
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? number.format(n) : '—'
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? '—' : date.format(d)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? '—' : dateTime.format(d)
}

export function initials(name: string | null | undefined): string {
  const clean = (name ?? '').trim()
  if (!clean) return 'TT'
  const parts = clean.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic hue for initials avatars based on a name string.
export function avatarHue(name: string | null | undefined): number {
  const clean = (name ?? '').trim()
  if (!clean) return 158
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0
  return hash % 360
}