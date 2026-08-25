"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const form = new FormData()
    form.set('name', name)
    if (file) form.set('file', file)
    try {
      const r = await fetch('/api/onboarding', { method: 'POST', body: form })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        // Continue the same verification journey — see status + optional
        // NANTA/IATA, never re-ask for the same KYB document.
        router.push('/agent/verification')
        return
      }
      setStatus({ kind: 'err', text: j.error || 'Unable to submit.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Legal business name
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your registered business name" />
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

      {status && (
        <Alert variant={status.kind === 'err' ? 'error' : 'success'}>{status.text}</Alert>
      )}

      <Button type="submit" disabled={busy} size="lg">
        {busy ? 'Submitting…' : 'Submit for verification'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Your documents are kept private and only reviewed by our team.</p>
    </form>
  )
}