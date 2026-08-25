import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { WithdrawalForm } from '../../dashboard/wallet/withdrawal-form'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatDate } from '@/lib/format'

type WithdrawalItem = { id: string; amount: number; currency: string; status: string; created_at: string; failure_reason?: string | null }

export default async function AgentWithdrawalsPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const { agency, response } = await requireVerifiedAgent()
  if (response) redirect('/onboarding')

  const [walletRes, withdrawalsRes] = await Promise.all([
    s.from('wallets').select('available_balance, escrow_balance, currency').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('withdrawals').select('*').eq('seller_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
  ])

  const wallet = walletRes.data
  const withdrawals = (withdrawalsRes.data ?? []) as WithdrawalItem[]

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <div>
          <p className="font-eyebrow text-primary">Withdrawals</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Request a withdrawal</h1>
          <p className="mt-1 text-muted-foreground">Move your available balance to your bank account.</p>
        </div>

        {/* Available balance */}
        <section className="mt-6 rounded-3xl border border-border bg-primary p-6 text-primary-foreground shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/75">Available balance</p>
              <p className="mt-1 font-mono text-4xl font-semibold">{formatMoney(wallet?.available_balance, wallet?.currency)}</p>
              {Number(wallet?.escrow_balance) > 0 && (
                <p className="mt-1 text-sm text-primary-foreground/75">
                  + {formatMoney(wallet?.escrow_balance, wallet?.currency)} held securely against active orders
                </p>
              )}
            </div>
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-card transition hover:opacity-90"
            >
              <WalletCards className="size-4" /> View full wallet
            </Link>
          </div>
        </section>

        {/* Withdrawal form */}
        <section className="mt-5 rounded-[1.5rem] border border-border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-semibold">Request a withdrawal</h2>
          <WithdrawalForm />
        </section>

        {/* History */}
        <section className="mt-5 rounded-[1.5rem] border border-border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-semibold">Withdrawal history</h2>
          <div className="mt-4">
            {withdrawals.length === 0 ? (
              <EmptyState
                icon={WalletCards}
                title="No withdrawals yet"
                description="When you request a withdrawal, it will appear here."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm last:border-0">
                    <div>
                      <span className="font-medium">{formatMoney(w.amount, w.currency)}</span>
                      <span className="ml-3 text-muted-foreground">{formatDate(w.created_at)}</span>
                      {w.failure_reason && <p className="mt-0.5 text-xs text-destructive">{w.failure_reason}</p>}
                    </div>
                    <StatusBadge domain="withdrawal" status={w.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}