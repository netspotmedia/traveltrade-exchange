"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')
    setBusy(true)
    setStatus('Uploading and saving your details…')
    const form = new FormData()
    form.set('name', name)
    form.set('documentType', 'business_registration')
    if (file) form.set('file', file)
    try {
      const r = await fetch('/api/onboarding', { method: 'POST', body: form })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        setStatus('Application submitted for review.')
        router.push('/dashboard')
      } else {
        setStatus(j.error || 'Unable to submit.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Complete your business profile"
      subtitle="Submit your business details and a registration document. We'll review it before you can sell services."
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Legal business name
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your registered business name" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Registration document
          <span className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center transition hover:border-primary/40 hover:bg-brand-soft/40">
            <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">{file ? file.name : 'Choose a file'}</span>
            <span className="text-xs text-muted-foreground">PDF, PNG, JPG or JPEG · max 10MB</span>
            <input
              required
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </span>
        </label>

        {status && (
          <p role="status" className={status.includes('submitted') ? 'rounded-xl bg-success/30 px-4 py-3 text-sm text-success-foreground' : 'rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'}>
            {status}
          </p>
        )}

        <Button type="submit" disabled={busy} size="lg" className="h-12 text-base">
          {busy ? 'Submitting…' : 'Submit for verification'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Your documents are kept private and only reviewed by our team.</p>
      </form>
    </AuthShell>
  )
}