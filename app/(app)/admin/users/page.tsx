import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

const PER_PAGE = 50

const ROLE_LABELS: Record<string, string> = { buyer: 'Buyer', seller: 'Agent', admin: 'Admin' }
const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'info' | 'warning' | 'destructive' | 'neutral'> = {
  buyer: 'info',
  seller: 'success',
  admin: 'destructive',
}

type UserRow = {
  id: string
  role: string
  email: string | null
  full_name: string | null
  created_at: string
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PER_PAGE

  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await s.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: users, count }, { count: total }] = await Promise.all([
    s.from('profiles').select('id, role, email, full_name, created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(skip, skip + PER_PAGE - 1),
    s.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const list = (users ?? []) as UserRow[]
  const totalCount = count ?? total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))

  function buildPage(p: number) {
    return p > 1 ? `/admin/users?page=${p}` : '/admin/users'
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold text-primary">Users</p>
          <h1 className="mt-2 text-4xl font-semibold">All users</h1>
          <p className="mt-1 text-muted-foreground">{totalCount} registered {totalCount === 1 ? 'account' : 'accounts'} on the platform.</p>
        </div>

        {list.length === 0 ? (
          <EmptyState title="No users yet" description="Registered users will appear here as accounts are created." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{u.full_name || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge variant={ROLE_VARIANTS[u.role] ?? 'neutral'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
                {page > 1 ? (
                  <Link href={buildPage(page - 1)} className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-card transition hover:bg-muted">
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">Previous</span>
                )}
                <span className="text-sm text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={buildPage(page + 1)} className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-card transition hover:bg-muted">
                    Next
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground/50">Next</span>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  )
}