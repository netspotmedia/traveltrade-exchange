"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MfaEnrollment({ enforced }: { enforced: boolean }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
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
      setSecret(j.secret ?? '')
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
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an extra layer of security with an authenticator app like Google Authenticator or 1Password.
          </p>
        </div>
      </div>

      {enforced && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/30 px-4 py-3 text-sm text-warning-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          MFA is required for your account. Set it up now to keep your account and payments protected.
        </p>
      )}

      <div className="mt-6">
        {!factorId ? (
          <Button onClick={enroll} disabled={busy} size="lg">
            {busy ? 'Setting up…' : 'Set up MFA'}
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background/60 p-5 sm:flex-row sm:items-start">
              {qrCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCode} alt="Scan this QR code with your authenticator app" className="size-44 shrink-0 rounded-lg border border-border bg-white" />
              )}
              <div className="flex flex-col gap-2 text-sm">
                <p className="font-medium">Scan the QR code, then enter the 6-digit code to confirm.</p>
                {secret && (
                  <p className="rounded-xl bg-muted px-3 py-2 font-mono text-xs break-all text-muted-foreground">
                    Secret: {secret}
                  </p>
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Authentication code
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="max-w-56"
              />
            </label>

            <div>
              <Button onClick={verify} disabled={busy || code.length < 6}>
                {busy ? 'Verifying…' : 'Verify and enable'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </section>
  )
}