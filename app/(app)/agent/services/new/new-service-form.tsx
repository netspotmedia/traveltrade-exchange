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
  const [included, setIncluded] = useState('')
  const [requirements, setRequirements] = useState('')
  const [delivery, setDelivery] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function toList(value: string): string[] {
    return value.split('\n').map((v) => v.trim()).filter(Boolean)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('Creating service…')
    try {
      const r = await fetch('/api/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          description,
          location,
          basePrice,
          details: { included: toList(included), requirements: toList(requirements), delivery: delivery.trim() || null },
        }),
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
    <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What's included (optional)
          <Textarea value={included} onChange={(e) => setIncluded(e.target.value)} rows={4} placeholder="One item per line" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What the customer needs to provide (optional)
          <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={4} placeholder="One item per line" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Delivery expectations (optional)
        <Textarea value={delivery} onChange={(e) => setDelivery(e.target.value)} rows={2} placeholder="e.g. Quote within 24 hours; delivery within 5 working days" />
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