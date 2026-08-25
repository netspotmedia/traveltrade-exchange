'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TYPES = [
  { value: 'kyb', label: 'KYB — business verification' },
  { value: 'nanta', label: 'NANTA membership' },
  { value: 'iata', label: 'IATA certification' },
]

export function VerificationSubmitForm({ pendingTypes }: { pendingTypes: Set<string> }) {
  const [type, setType] = useState<string>('kyb')
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  const locked = pendingTypes.has(type)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (locked || !file) return
    setBusy(true)
    setMessage(null)
    const form = new FormData()
    form.set('type', type)
    form.set('notes', notes)
    if (file) form.set('file', file)
    try {
      const r = await fetch('/api/verification/submit', { method: 'POST', body: form })
      const j = await r.json()
      if (r.ok) {
        setMessage({ kind: 'ok', text: 'Submitted for review. We will notify you once it is reviewed.' })
        setFile(null)
        setNotes('')
        router.refresh()
      } else {
        setMessage({ kind: 'err', text: j.error || 'Unable to submit' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Verification type
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center transition hover:border-primary/40 hover:bg-brand-soft/40">
        <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">{file ? file.name : 'Choose a document'}</span>
        <span className="text-xs text-muted-foreground">PDF, PNG, JPG or JPEG · max 10MB</span>
        <input
          required
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="sr-only"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Notes (optional)
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Membership number, registration details…" />
      </label>

      {locked && <p className="text-sm text-warning-foreground">You already have a pending {type.toUpperCase()} submission. Wait for review before resubmitting.</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || locked || !file}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </Button>
        {message && <p className={message.kind === 'ok' ? 'text-sm text-success-foreground' : 'text-sm text-destructive'}>{message.text}</p>}
      </div>
    </form>
  )
}