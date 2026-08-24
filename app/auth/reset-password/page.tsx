'use client'
import { FormEvent, useState } from 'react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (password !== confirm) {
      setMessage('Passwords do not match.')
      return
    }
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok) {
      setDone(true)
      setMessage('Password updated. You can now sign in.')
    } else {
      setMessage(j.error || 'Unable to update password.')
    }
  }

  if (done) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 px-5">
        <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">Password updated</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <a href="/auth/login" className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Sign in
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">TravelTrade Exchange</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a new password</h1>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          New password
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Confirm password
          <input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <button className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Update password</button>
      </form>
    </main>
  )
}
