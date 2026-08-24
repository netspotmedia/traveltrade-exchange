import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WalletTopUp } from './wallet-top-up'
import { WithdrawalForm } from './withdrawal-form'

export default async function WalletPage() {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: wallet }, { data: profile }, { data: withdrawals }] = await Promise.all([
    s.from('wallets').select('*, wallet_ledger(*)').eq('user_id', user.id).maybeSingle(),
    s.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    s.from('withdrawals').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
  ])

  const isSeller = profile?.role === 'seller'

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Wallet</p>
          <h1 className="mt-2 text-4xl font-semibold">Funds and activity</h1>
        </div>

        <section className="rounded-3xl border bg-card p-8">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="mt-2 text-4xl font-semibold">₦{Number(wallet?.available_balance || 0).toLocaleString()}</p>
          <WalletTopUp />
          {isSeller && <WithdrawalForm />}
        </section>

        {isSeller && (
          <section className="rounded-3xl border bg-card p-8">
            <h2 className="font-semibold">Withdrawals</h2>
            <div className="mt-4 flex flex-col gap-3">
              {!withdrawals || withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
              ) : (
                (withdrawals as { id: string; amount: number; currency: string; status: string; created_at: string; failure_reason?: string | null }[]).map((w) => (
                  <div key={w.id} className="flex items-center justify-between border-b py-3 text-sm">
                    <div>
                      <span className="font-medium">₦{Number(w.amount).toLocaleString()} {w.currency}</span>
                      <span className="ml-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                      {w.failure_reason && <p className="text-xs text-destructive">{w.failure_reason}</p>}
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{w.status}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl border bg-card p-8">
          <h2 className="font-semibold">Ledger</h2>
          <div className="mt-4 flex flex-col gap-3">
            {(wallet?.wallet_ledger || []).map((item: { id: string; entry_type: string; amount: number; created_at: string }) => (
              <div className="flex justify-between border-b py-3 text-sm" key={item.id}>
                <span>{item.entry_type}</span>
                <span>₦{Number(item.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
