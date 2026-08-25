import { createClient } from '@/lib/supabase/server'

type RpcResult = {
  ok: boolean
  error?: string
  already_processed?: boolean
  [key: string]: unknown
}

async function callRpc(name: string, params: Record<string, unknown>): Promise<RpcResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(name, params)
  if (error) return { ok: false, error: error.message }
  return (data ?? { ok: false, error: 'No response from settlement engine' }) as RpcResult
}

export function creditWalletFromTopup(params: {
  userId: string
  amount: number
  currency?: string
  providerReference: string
}) {
  return callRpc('credit_wallet_from_topup', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_currency: params.currency ?? 'NGN',
    p_provider_reference: params.providerReference,
  })
}

export function completeCustomerEscrow(params: {
  reference: string
  amount: number
  currency?: string
}) {
  return callRpc('complete_customer_escrow', {
    p_reference: params.reference,
    p_amount: params.amount,
    p_currency: params.currency ?? 'NGN',
  })
}

export function fundEscrowFromWallet(params: { orderId: string; buyerId: string }) {
  return callRpc('fund_escrow_from_wallet', {
    p_order_id: params.orderId,
    p_buyer_id: params.buyerId,
  })
}

export function releaseMilestone(params: { milestoneId: string; actorId: string }) {
  return callRpc('release_milestone', {
    p_milestone_id: params.milestoneId,
    p_actor_id: params.actorId,
  })
}

export function submitMilestone(params: { milestoneId: string; actorId: string }) {
  return callRpc('submit_milestone', {
    p_milestone_id: params.milestoneId,
    p_actor_id: params.actorId,
  })
}

export function approveMilestone(params: { milestoneId: string; actorId: string }) {
  return callRpc('approve_milestone', {
    p_milestone_id: params.milestoneId,
    p_actor_id: params.actorId,
  })
}

export function requestWithdrawal(params: {
  userId: string
  amount: number
  bankName: string
  accountName: string
  accountNumber: string
}) {
  return callRpc('request_withdrawal', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_bank_name: params.bankName,
    p_account_name: params.accountName,
    p_account_number: params.accountNumber,
  })
}

export function processWithdrawal(params: {
  withdrawalId: string
  decision: 'paid' | 'rejected'
  actorId: string
  note?: string | null
}) {
  return callRpc('process_withdrawal', {
    p_withdrawal_id: params.withdrawalId,
    p_decision: params.decision,
    p_actor_id: params.actorId,
    p_note: params.note ?? null,
  })
}

export function resolveDispute(params: {
  disputeId: string
  decision: 'resolved_buyer' | 'resolved_seller'
  actorId: string
  note?: string | null
}) {
  return callRpc('resolve_dispute', {
    p_dispute_id: params.disputeId,
    p_decision: params.decision,
    p_actor_id: params.actorId,
    p_note: params.note ?? null,
  })
}

export function refundOrderEscrow(params: { orderId: string; actorId: string }) {
  return callRpc('refund_order_escrow', {
    p_order_id: params.orderId,
    p_actor_id: params.actorId,
  })
}

export function escalateDispute(params: { disputeId: string; actorId: string }) {
  return callRpc('escalate_dispute', {
    p_dispute_id: params.disputeId,
    p_actor_id: params.actorId,
  })
}

export function getFailedCallbacks(limit = 100) {
  return callRpc('admin_get_failed_callbacks', { p_limit: limit })
}

export function resolveFailedCallback(params: { callbackId: string; status: 'resolved' | 'ignored'; actorId: string }) {
  return callRpc('admin_resolve_failed_callback', {
    p_callback_id: params.callbackId,
    p_status: params.status,
    p_actor_id: params.actorId,
  })
}
