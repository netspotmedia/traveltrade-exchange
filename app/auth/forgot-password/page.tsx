'use client'
import { FormEvent, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        setMessage('If that email exists, a password reset link has been sent.')
      } else {
        setMessage(j.error || 'Unable to send reset link. Please try again later.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new password."
      footer={
        <a href="/auth/login" className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </a>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        {message && (
          <p role="status" className={message.startsWith('If that email') ? 'rounded-xl bg-success/30 px-4 py-3 text-sm text-success-foreground' : 'rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'}>
            {message}
          </p>
        )}
        <Button type="submit" disabled={busy} size="lg" className="h-12 text-base">
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}