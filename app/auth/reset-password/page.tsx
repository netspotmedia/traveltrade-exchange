'use client'
import { FormEvent, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (password !== confirm) {
      setMessage('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        setDone(true)
      } else {
        setMessage(j.error || 'Unable to update password.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <a href="/auth/login" className="block w-full">
          <Button size="lg" className="h-12 w-full text-base">
            Sign in
          </Button>
        </a>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick a strong password to secure your account."
      footer={
        <a href="/auth/login" className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </a>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          New password
          <Input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Confirm password
          <Input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" />
        </label>
        {message && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {message}
          </p>
        )}
        <Button type="submit" disabled={busy} size="lg" className="h-12 text-base">
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}