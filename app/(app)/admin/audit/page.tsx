import { redirect } from 'next/navigation'
import { ScrollText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'

type AuditRow = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  actor_name: string | null
  actor_email: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  agency_kyb_review: 'Agency verification reviewed',
  refund_review: 'Refund request reviewed',
  agreement_signed: 'Agreement signed',
  order_funded: 'Order escrow funded',
  order_disputed: 'Dispute opened',
  dispute_resolved: 'Dispute resolved',
  withdrawal_processed: 'Withdrawal processed',
  service_reviewed: 'Service reviewed',
  cms_updated: 'Content page updated',
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AdminAuditPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  let logs: AuditRow[] = []
  let error: string | null = null
  try {
    const res = await s.rpc('admin_get_audit_logs', { p_limit: 100 })
    logs = (res.data ?? []) as AuditRow[]
  } catch {
    error = 'Audit log unavailable.'
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Audit</p>
          <h1 className="mt-2 text-4xl font-semibold">Activity log</h1>
          <p className="mt-1 text-muted-foreground">A chronological trail of admin actions and platform state changes.</p>
        </div>

        {error || logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={error ? 'Audit log unavailable' : 'No audit activity yet'}
            description={error ? 'Could not load the audit trail.' : 'Admin actions and platform changes will appear here.'}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ACTION_LABELS[log.action] ?? humanize(log.action)}</p>
                    {log.entity_type && <p className="text-xs text-muted-foreground">{log.entity_type}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span>{log.actor_name || log.actor_email || 'System'}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}