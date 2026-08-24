'use client'
import { FormEvent, useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
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
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">TravelTrade Exchange</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">We will email you a link to set a new password.</p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <button className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Send reset link</button>
        <a href="/auth/login" className="text-center text-sm text-primary underline-offset-4 hover:underline">Back to sign in</a>
      </form>
    </main>
  )
}
