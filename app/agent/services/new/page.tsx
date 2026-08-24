"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewServicePage() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Creating service…')
    const r = await fetch('/api/services', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, category, description, location, basePrice }),
    })
    const j = await r.json()
    if (!r.ok) return setMessage(j.error || 'Unable to create service')
    setMessage('Service created as a draft. Submit it for approval to go live.')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-5 rounded-3xl border bg-card p-8">
        <div>
          <p className="text-sm font-semibold text-primary">Sell a service</p>
          <h1 className="mt-2 text-3xl font-semibold">Create a new service</h1>
          <p className="mt-2 text-muted-foreground">Services start as drafts and are published after moderation.</p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border bg-background px-4 py-3" placeholder="Lagos Executive Airport Transfer" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Category
          <input required value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border bg-background px-4 py-3" placeholder="Airport Transfer" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Description
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-xl border bg-background px-4 py-3" placeholder="What does this service include?" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Location (optional)
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl border bg-background px-4 py-3" placeholder="Lagos, Nigeria" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Starting price (NGN)
          <input required min="0" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="rounded-xl border bg-background px-4 py-3" placeholder="45000" />
        </label>
        <Button type="submit">Save draft</Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </form>
    </main>
  )
}
