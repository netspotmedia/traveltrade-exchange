"use client"
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function WithdrawalForm() {
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, bankName, accountName, accountNumber }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Withdrawal requested. Funds are held pending admin processing.' : (j.error || 'Unable to request withdrawal'))
      if (r.ok) {
        setAmount('')
        setBankName('')
        setAccountName('')
        setAccountNumber('')
        setConfirm(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-md flex-col gap-3 rounded-2xl border border-border bg-background/60 p-5">
      <h3 className="font-semibold">Withdraw earnings</h3>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Amount (NGN)
        <Input type="number" min="1" required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Bank name
        <Input required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="GTBank" autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Account name
        <Input required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Jane Doe" autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Account number
        <Input required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" inputMode="numeric" autoComplete="off" />
      </label>

      <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          required
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span>I understand this amount is deducted from my balance now and held until the withdrawal is processed.</span>
      </label>

      <div className="flex items-start gap-2 rounded-xl bg-warning/30 px-3 py-2.5 text-xs text-warning-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Double-check your bank details. A wrong account number can delay your payment.
      </div>

      <Button type="submit" disabled={busy || !confirm} className="w-full">
        {busy ? 'Requesting…' : 'Request withdrawal'}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  )
}