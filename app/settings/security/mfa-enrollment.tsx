"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function MfaEnrollment({ enforced }: { enforced: boolean }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function enroll() {
    setBusy(true)
    setMessage('Generating MFA secret…')
    try {
      const r = await fetch('/api/mfa/enroll', { method: 'POST' })
      const j = await r.json()
      if (!r.ok) return setMessage(j.error || 'Unable to start enrollment')
      setFactorId(j.factorId)
      setQrCode(j.qrCode ?? '')
      setMessage('Scan the QR code with your authenticator app, then enter the 6-digit code.')
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!factorId) return
    setBusy(true)
    setMessage('Verifying…')
    try {
      const r = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'MFA enabled successfully.' : (j.error || 'Verification failed'))
      if (r.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-2xl border p-6">
      <div>
        <h3 className="font-semibold">Two-factor authentication (TOTP)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add an extra layer of security with an authenticator app.
          {enforced && <span className="text-destructive"> MFA is required for your account.</span>}
        </p>
      </div>

      {!factorId ? (
        <Button onClick={enroll} disabled={busy}>Set up MFA</Button>
      ) : (
        <>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="MFA QR code" className="h-48 w-48 rounded-lg border" />
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            className="rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
          <Button onClick={verify} disabled={busy || code.length < 6}>Verify and enable</Button>
        </>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
