'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const j = await r.json()
      if (r.ok) {
        setFeedback({ kind: 'ok', text: 'Message sent. Our team will get back to you within 24 hours during business days.' })
        setName('')
        setEmail('')
        setMessage('')
      } else {
        setFeedback({ kind: 'err', text: j.error || 'Unable to send your message. Please try again.' })
      }
    } catch {
      setFeedback({ kind: 'err', text: 'Unable to send your message. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Message
        <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Tell us how we can help…" />
      </label>
      <Button type="submit" disabled={busy} size="lg">
        {busy ? 'Sending…' : 'Send message'}
      </Button>
      {feedback && <Alert variant={feedback.kind === 'ok' ? 'success' : 'error'}>{feedback.text}</Alert>}
    </form>
  )
}