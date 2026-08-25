import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/status-badge'
import { WalletTopUp } from './wallet-top-up'
import { WithdrawalForm } from './withdrawal-form'
import { formatMoney, formatDate } from '@/lib/format'

const LEDGER_LABELS: Record<string, string> = {
  top_up: 'Top-up',
  escrow_hold: 'Payment secured',
  escrow_release: 'Released to you',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  fee: 'Service fee',
}

type LedgerItem = { id: string; entry_type: string; amount: number; created_at: string }
type WithdrawalItem = { id: string; amount: number; currency: string; status: string; created_at: string; failure_reason?: string | null }

export default async function WalletPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: wallet }, { data: profile }, { data: withdrawals }] = await Promise.all([
    s.from('wallets').select('*, wallet_ledger(*)').eq('user_id', user.id).is('deleted_at', null).maybeSingle(),
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('withdrawals').select('*').eq('seller_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
  ])

  const isSeller = profile?.role === 'seller'
  const ledger = (wallet?.wallet_ledger ?? []) as LedgerItem[]

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-24 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Wallet</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your balance</h1>
          <p className="mt-1 text-muted-foreground">Top up to pay for services, and withdraw what you've earned.</p>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Available balance</p>
              <p className="mt-1 font-mono text-4xl font-semibold">{formatMoney(wallet?.available_balance, wallet?.currency)}</p>
              {Number(wallet?.escrow_balance) > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">+ {formatMoney(wallet?.escrow_balance, wallet?.currency)} held securely against active orders</p>
              )}
            </div>
          </div>
          <WalletTopUp />
          {isSeller && <WithdrawalForm />}
        </section>

        {isSeller && (
          <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-lg font-semibold">Withdrawals</h2>
            <div className="mt-4 flex flex-col gap-3">
              {!withdrawals || (withdrawals as WithdrawalItem[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals yet. When you're ready, request a withdrawal above.</p>
              ) : (
                (withdrawals as WithdrawalItem[]).map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm last:border-0">
                    <div>
                      <span className="font-medium">{formatMoney(w.amount, w.currency)}</span>
                      <span className="ml-3 text-muted-foreground">{formatDate(w.created_at)}</span>
                      {w.failure_reason && <p className="mt-0.5 text-xs text-destructive">{w.failure_reason}</p>}
                    </div>
                    <StatusBadge domain="withdrawal" status={w.status} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-semibold">Activity</h2>
          <div className="mt-4 flex flex-col gap-3">
            {ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet. Your top-ups, payments and withdrawals will appear here.</p>
            ) : (
              ledger.map((item: LedgerItem) => (
                <div className="flex items-center justify-between border-b border-border py-3 text-sm last:border-0" key={item.id}>
                  <div>
                    <p className="font-medium">{LEDGER_LABELS[item.entry_type] ?? item.entry_type}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <span className="font-mono font-medium">{formatMoney(item.amount, wallet?.currency)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}