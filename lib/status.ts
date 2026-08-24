export type StatusTone = 'neutral' | 'success' | 'warning' | 'info' | 'destructive'

export type StatusDomain =
  | 'order'
  | 'milestone'
  | 'service'
  | 'agency'
  | 'withdrawal'
  | 'dispute'
  | 'proposal'

export interface StatusInfo {
  label: string
  tone: StatusTone
}

// Human-readable mapping of every existing backend state.
// Never invent states; only translate what the backend actually produces.
const MAP: Record<StatusDomain, Record<string, StatusInfo>> = {
  order: {
    proposed: { label: 'Awaiting agreement', tone: 'warning' },
    funded: { label: 'Payment secured', tone: 'info' },
    in_progress: { label: 'In progress', tone: 'info' },
    delivered: { label: 'Delivered', tone: 'success' },
    completed: { label: 'Completed', tone: 'success' },
    disputed: { label: 'Dispute open', tone: 'destructive' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
  },
  milestone: {
    pending: { label: 'Not started', tone: 'neutral' },
    submitted: { label: 'Submitted for review', tone: 'info' },
    approved: { label: 'Approved', tone: 'success' },
    released: { label: 'Paid out', tone: 'success' },
    funded: { label: 'Payment secured', tone: 'info' },
  },
  service: {
    draft: { label: 'Draft', tone: 'neutral' },
    pending: { label: 'In review', tone: 'warning' },
    published: { label: 'Live', tone: 'success' },
    rejected: { label: 'Not approved', tone: 'destructive' },
  },
  agency: {
    pending: { label: 'Verification in progress', tone: 'warning' },
    verified: { label: 'Verified', tone: 'success' },
    rejected: { label: 'Not verified', tone: 'destructive' },
  },
  withdrawal: {
    pending: { label: 'Processing', tone: 'warning' },
    paid: { label: 'Sent', tone: 'success' },
    rejected: { label: 'Refunded', tone: 'neutral' },
  },
  dispute: {
    open: { label: 'Open', tone: 'warning' },
    under_review: { label: 'Under review', tone: 'warning' },
    resolved_buyer: { label: 'Resolved', tone: 'success' },
    resolved_seller: { label: 'Resolved', tone: 'success' },
    closed: { label: 'Closed', tone: 'neutral' },
  },
  proposal: {
    pending: { label: 'Waiting', tone: 'neutral' },
    submitted: { label: 'Submitted', tone: 'info' },
    countered: { label: 'Counter offer', tone: 'warning' },
    accepted: { label: 'Accepted', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'destructive' },
    declined: { label: 'Declined', tone: 'destructive' },
  },
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function statusInfo(domain: StatusDomain, status: string | null | undefined): StatusInfo {
  if (!status) return { label: '—', tone: 'neutral' }
  const fallback: StatusInfo = { label: humanize(status), tone: 'neutral' }
  return MAP[domain]?.[status] ?? fallback
}