import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireVerifiedAgent } from '@/lib/server/workflows'
import { WithdrawalForm } from '../../dashboard/wallet/withdrawal-form'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Panel, SectionTitle } from '@/components/dashboard/panel'
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
      <main id="main" className="relative w-full px-4 py-8 pb-24 lg:px-8 lg:py-10">
        <PageHeader
          title="Request a withdrawal"
          description="Move your available balance to your bank account."
        />

        {/* Available balance */}
        <section className="mt-6 rounded-3xl bg-primary p-6 text-on-primary shadow-lg shadow-primary-container/20">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary-container/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl"
            >
              <WalletCards className="size-4" /> View full wallet
            </Link>
          </div>
        </section>

        {/* Withdrawal form */}
        <Panel className="mt-5 p-6 sm:p-8">
          <SectionTitle>Request a withdrawal</SectionTitle>
          <WithdrawalForm />
        </Panel>

        {/* History */}
        <Panel className="mt-5 p-6 sm:p-8">
          <SectionTitle>Withdrawal history</SectionTitle>
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
                  <div key={w.id} className="group flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-soft-lg active:scale-[0.995] last:border-0">
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
        </Panel>
      </main>
    </div>
  )
}