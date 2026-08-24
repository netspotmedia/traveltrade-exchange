import { statusInfo, type StatusDomain, type StatusTone } from '@/lib/status'
import { Badge } from '@/components/ui/badge'

const toneToVariant: Record<StatusTone, 'success' | 'warning' | 'info' | 'destructive' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  destructive: 'destructive',
  neutral: 'neutral',
}

// Translates a raw backend state into human language with the right tone.
export function StatusBadge({ domain, status, className }: { domain: StatusDomain; status: string | null | undefined; className?: string }) {
  const info = statusInfo(domain, status)
  return (
    <Badge variant={toneToVariant[info.tone]} className={className}>
      {info.label}
    </Badge>
  )
}