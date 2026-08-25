"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const CREDENTIALS = [
  { key: 'cac', label: 'CAC Verified' },
  { key: 'nanta', label: 'NANTA Verified' },
  { key: 'iata', label: 'IATA Verified' },
]

export function KybReviewActions({ agencyId }: { agencyId: string }) {
  const [note, setNote] = useState('')
  const [credentials, setCredentials] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(decision)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/kyb/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId, decision, note, credentials }),
      })
      const j = await r.json()
      setMessage(r.ok ? { kind: 'ok', text: 'Review recorded.' } : { kind: 'err', text: j.error || 'Action failed' })
      if (r.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer note (optional)"
        rows={2}
        className="min-h-16"
      />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Credentials confirmed (shown on approve)</legend>
        <div className="flex flex-wrap gap-2">
          {CREDENTIALS.map((c) => {
            const active = credentials.includes(c.key)
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => setCredentials((prev) => (active ? prev.filter((k) => k !== c.key) : [...prev, c.key]))}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                  active ? 'border-primary/40 bg-brand-soft text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {c.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button size="sm" disabled={busy !== null} onClick={() => decide('approved')}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
      {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
    </div>
  )
}