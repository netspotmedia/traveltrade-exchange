import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const STATUSES = ['sent', 'failed', 'retrying', 'queued', 'sending']

type LogRow = {
  id: string
  recipient: string
  subject: string
  provider: string
  status: string
  attempts: number
  error: string | null
  created_at: string
}

type CountRow = { status: string; count: number }

export default async function AdminEmailLogsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const filter = status && STATUSES.includes(status) ? status : null

  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  let logs: LogRow[] = []
  let counts: CountRow[] = []
  try {
    const [logsRes, countsRes] = await Promise.all([
      s.rpc('admin_get_email_logs_filtered', { p_status: filter, p_limit: 100 }),
      s.rpc('admin_get_email_status_counts'),
    ])
    logs = (logsRes.data ?? []) as LogRow[]
    counts = (countsRes.data ?? []) as CountRow[]
  } catch {
    // RPCs may be unavailable before the migration is applied.
  }

  const countMap = Object.fromEntries(counts.map((c) => [c.status, Number(c.count)]))

  function buildHref(value: string | null) {
    return value ? `/admin/email-logs?status=${value}` : '/admin/email-logs'
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Email</p>
          <h1 className="mt-2 text-4xl font-semibold">Email delivery</h1>
          <p className="mt-1 text-muted-foreground">Monitor transactional email delivery. Recipients are masked for privacy.</p>
        </div>

        {/* Status summary */}
        <div className="grid gap-4 sm:grid-cols-5">
          {STATUSES.map((st) => (
            <Link key={st} href={buildHref(st)} className={cn('rounded-2xl border bg-card p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lift', filter === st ? 'border-primary/40 ring-2 ring-primary/30' : 'border-border')}>
              <p className="font-mono text-2xl font-semibold">{countMap[st] ?? 0}</p>
              <p className="text-sm capitalize text-muted-foreground">{st}</p>
            </Link>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <Link href={buildHref(null)} className={cn('rounded-full border px-3 py-1 text-sm transition', !filter ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted')}>
            All
          </Link>
          {STATUSES.map((st) => (
            <Link key={st} href={buildHref(st)} className={cn('rounded-full border px-3 py-1 text-sm capitalize transition', filter === st ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted')}>
              {st}
            </Link>
          ))}
        </div>

        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-12 text-center text-sm text-muted-foreground">
            {filter ? `No ${filter} emails.` : 'No email activity yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Attempts</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          log.status === 'sent' ? 'bg-success/25 text-success-foreground' : log.status === 'failed' ? 'bg-destructive/15 text-destructive' : 'bg-warning/25 text-warning-foreground',
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{log.recipient}</td>
                    <td className="max-w-[240px] truncate px-5 py-3">{log.subject}</td>
                    <td className="px-5 py-3 text-muted-foreground">{log.provider}</td>
                    <td className="px-5 py-3 text-muted-foreground">{log.attempts}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}