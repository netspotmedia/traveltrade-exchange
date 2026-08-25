'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Current {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export function BrandingForm({ assetKey, current }: { assetKey: string; current: Current | null }) {
  const [url, setUrl] = useState(current?.url ?? '')
  const [alt, setAlt] = useState(current?.alt ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: assetKey, url, alt }),
      })
      const j = await r.json()
      if (r.ok) {
        setMessage({ kind: 'ok', text: 'Saved.' })
        router.refresh()
      } else {
        setMessage({ kind: 'err', text: j.error || 'Unable to save.' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Asset URL
        <Input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Alt text
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="TravelTrade Exchange" />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {message && <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>}
      </div>
    </form>
  )
}