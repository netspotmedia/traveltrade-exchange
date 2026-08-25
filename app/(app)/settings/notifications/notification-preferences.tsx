"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EVENTS: { key: string; label: string }[] = [
  { key: 'agency_verification', label: 'Agency verification' },
  { key: 'service_review', label: 'Service approval' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'dispute', label: 'Disputes' },
  { key: 'general', label: 'General updates' },
]

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => r.json())
      .then((j) => {
        const map: Record<string, boolean> = {}
        for (const e of EVENTS) map[e.key] = true
        for (const p of j.preferences ?? []) map[p.event] = p.email
        setPrefs(map)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  async function save() {
    setBusy(true)
    setMessage('Saving…')
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferences: EVENTS.map((e) => ({ event: e.key, email: prefs[e.key] ?? true })) }),
      })
      const j = await r.json()
      setMessage(r.ok ? 'Preferences saved.' : (j.error || 'Unable to save'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 surface-soft sm:p-8">
      <h2 className="text-lg font-semibold">Email notifications</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose which email notifications you receive. Mandatory security emails (withdrawals, refunds, security) are always sent.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {EVENTS.map((e) => {
          const checked = prefs[e.key] ?? true
          return (
            <label
              key={e.key}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 transition',
                checked ? 'border-primary/25 bg-brand-soft/40' : 'border-border bg-background/50',
              )}
            >
              <span className="text-sm font-medium">{e.label}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={(ev) => setPrefs((p) => ({ ...p, [e.key]: ev.target.checked }))}
                className="size-5 accent-[var(--brand)]"
              />
            </label>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={busy || !loaded} size="lg">
          {busy ? 'Saving…' : 'Save preferences'}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </section>
  )
}