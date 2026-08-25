'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface FieldDef {
  key: string
  label: string
  textarea?: boolean
}

export function CmsEditor({
  slug,
  initial,
  fields,
  isPublished,
}: {
  slug: string
  initial: Record<string, string>
  fields: FieldDef[]
  isPublished: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? ''])),
  )
  const [publish, setPublish] = useState(isPublished)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const router = useRouter()

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, hero: values, isPublished: publish }),
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium">
          {f.label}
          {f.textarea ? (
            <Textarea
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          ) : (
            <Input value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
          )}
        </label>
      ))}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="size-4 accent-[var(--brand)]"
        />
        Published (visible to visitors)
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {message && (
          <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>
        )}
      </div>
    </form>
  )
}