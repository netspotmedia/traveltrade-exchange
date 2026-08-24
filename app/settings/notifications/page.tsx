"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const EVENTS: { key: string; label: string }[] = [
  { key: 'agency_verification', label: 'Agency verification' },
  { key: 'service_review', label: 'Service approval' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'dispute', label: 'Disputes' },
  { key: 'general', label: 'General updates' },
]

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
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
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold">Email notifications</h1>
          <p className="mt-2 text-muted-foreground">Choose which email notifications you receive. Mandatory security emails are always sent.</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
          {EVENTS.map((e) => (
            <label key={e.key} className="flex items-center justify-between rounded-xl border p-4">
              <span className="font-medium">{e.label}</span>
              <input
                type="checkbox"
                checked={prefs[e.key] ?? true}
                onChange={(ev) => setPrefs((p) => ({ ...p, [e.key]: ev.target.checked }))}
                className="size-5"
              />
            </label>
          ))}
          <div className="mt-2 flex items-center gap-3">
            <Button onClick={save} disabled={busy}>Save preferences</Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </div>
      </div>
    </main>
  )
}
