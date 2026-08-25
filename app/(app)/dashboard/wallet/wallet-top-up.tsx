"use client"
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function WalletTopUp() {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const j = await r.json()
      if (!r.ok) return setMessage(j.error || 'Unable to start top-up')
      if (j.authorizationUrl) {
        setMessage('Redirecting to secure checkout…')
        window.location.href = j.authorizationUrl
        return
      }
      setMessage('Paystack checkout is not available yet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 flex max-w-md flex-col gap-3">
      <p className="text-sm font-medium">Top up your balance</p>
      <label className="sr-only" htmlFor="topup-amount">
        Top up amount
      </label>
      <Input
        id="topup-amount"
        type="number"
        min="1"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in naira, e.g. 100000"
      />
      <Button onClick={submit} disabled={busy || !amount}>
        {busy ? 'Starting…' : 'Start secure top-up'}
      </Button>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        You'll be redirected to a secure checkout to complete your payment. Funds appear in your balance automatically.
      </p>
      {message && <Alert variant={message.startsWith('Unable') || message.includes('not available') ? 'error' : 'info'}>{message}</Alert>}
    </div>
  )
}