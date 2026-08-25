'use client'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/auth-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.')
        return
      }
      const next = new URLSearchParams(window.location.search).get('next')
      const safeNext = next && next.startsWith('/') ? next : '/dashboard'
      window.location.href = safeNext
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your travel work."
      footer={
        <div className="flex items-center justify-between text-sm">
          <a href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
            Forgot password?
          </a>
          <a href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </a>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </label>
        {message && (
          <Alert variant="error">{message}</Alert>
        )}
        <Button type="submit" disabled={busy} size="lg">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}