"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function NewServiceForm() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('Creating service…')
    try {
      const r = await fetch('/api/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, category, description, location, basePrice }),
      })
      const j = await r.json()
      if (!r.ok) return setMessage(j.error || 'Unable to create service')
      setMessage('Service created as a draft. Submit it for approval to go live.')
      router.refresh()
      router.push('/agent/services')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">Sell a service</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create a new service</h1>
        <p className="mt-2 text-muted-foreground">Services start as drafts and go live after moderation.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Service title
        <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lagos Executive Airport Transfer" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Category
        <Input required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Airport Transfer" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Description
        <Textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What does this service include? Be specific so customers know what to expect."
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Location (optional)
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Starting price (NGN)
        <Input required min="0" type="number" inputMode="numeric" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="45000" />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={busy} size="lg">
          {busy ? 'Creating…' : 'Save draft'}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </form>
  )
}