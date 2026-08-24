"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function WithdrawalForm() {
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('Requesting withdrawal…')
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, bankName, accountName, accountNumber }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Withdrawal requested. Funds are held pending admin processing.' : (j.error || 'Unable to request withdrawal'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-md flex-col gap-3 rounded-2xl border p-5">
      <h3 className="font-semibold">Withdraw earnings</h3>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Amount (NGN)
        <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="50000" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bank name
        <input required value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="GTBank" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Account name
        <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="Jane Doe" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Account number
        <input required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5" placeholder="0123456789" />
      </label>
      <Button type="submit" disabled={busy}>Request withdrawal</Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  )
}
