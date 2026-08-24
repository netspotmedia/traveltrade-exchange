"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function WalletTopUp() {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMessage('Starting secure top-up…')
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
      <label className="text-sm font-medium">
        Top up amount
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 w-full rounded-xl border bg-background px-4 py-3"
          placeholder="100000"
        />
      </label>
      <Button onClick={submit} disabled={busy}>
        Start secure top-up
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}