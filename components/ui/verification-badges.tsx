import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const VERIFICATION_LABELS: Record<string, string> = {
  cac: 'CAC Verified',
  nanta: 'NANTA Verified',
  iata: 'IATA Verified',
}

// Renders confirmed agency credentials (CAC / NANTA / IATA). Only shows
// badges that the backend actually recorded during KYB review.
export function VerificationBadges({ verifications, className }: { verifications?: string[] | null; className?: string }) {
  const list = (verifications ?? []).filter((v) => VERIFICATION_LABELS[v])
  if (list.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {list.map((v) => (
        <Badge key={v} variant="success" className="gap-1">
          <BadgeCheck className="size-3" aria-hidden="true" />
          {VERIFICATION_LABELS[v]}
        </Badge>
      ))}
    </div>
  )
}