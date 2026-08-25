'use client'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/auth-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: { full_name: name },
        },
      })
      setMessage(error ? 'Unable to create account. Check your details and try again.' : 'Check your email to confirm your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join a safer way to move travel work forward."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </a>
        </p>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Full name
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <Input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>
        {message && (
          <Alert variant={message.startsWith('Check') ? 'success' : 'error'}>{message}</Alert>
        )}
        <Button type="submit" disabled={busy} size="lg">
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to use TravelTrade Exchange for legitimate travel services.</p>
      </form>
    </AuthShell>
  )
}