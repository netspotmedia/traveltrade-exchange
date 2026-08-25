"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { publicImageUrl } from '@/lib/images'

interface EditServiceFormProps {
  service: {
    id: string
    title: string
    category: string
    description: string | null
    location: string | null
    base_price: number
    images: string[]
    details: { included: string[]; requirements: string[]; delivery: string | null }
  }
}

export function EditServiceForm({ service }: EditServiceFormProps) {
  const [title, setTitle] = useState(service.title)
  const [category, setCategory] = useState(service.category)
  const [description, setDescription] = useState(service.description ?? '')
  const [location, setLocation] = useState(service.location ?? '')
  const [basePrice, setBasePrice] = useState(String(service.base_price))
  const [included, setIncluded] = useState(service.details.included.join('\n'))
  const [requirements, setRequirements] = useState(service.details.requirements.join('\n'))
  const [delivery, setDelivery] = useState(service.details.delivery ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function toList(value: string): string[] {
    return value.split('\n').map((v) => v.trim()).filter(Boolean)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
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
      if (!r.ok) return setMessage(j.error || 'Unable to update service')
      setMessage('Service updated.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function uploadImage(file: File | null) {
    if (!file) return
    setBusy(true)
    setMessage('Uploading image…')
    try {
      const form = new FormData()
      form.set('file', file)
      const r = await fetch(`/api/services/${service.id}/images`, { method: 'POST', body: form })
      const j = await r.json()
      if (!r.ok) return setMessage(j.error || 'Unable to upload image')
      setMessage('Image uploaded.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const firstImage = service.images[0] ? publicImageUrl(service.images[0]) : null

  return (
    <form onSubmit={save} className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div>
        <p className="text-sm font-semibold text-primary">Sell a service</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Edit service</h1>
        <p className="mt-2 text-muted-foreground">Changes apply to drafts. Published services go through review again.</p>
      </div>

      {/* Image */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Service image</p>
        {firstImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstImage} alt={service.title} className="h-40 w-full rounded-2xl border border-border object-cover" />
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted">
          <ImagePlus className="size-4" aria-hidden="true" />
          {firstImage ? 'Replace image' : 'Upload an image'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="sr-only" onChange={(e) => uploadImage(e.target.files?.[0] ?? null)} disabled={busy} />
        </label>
        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF · max 5MB. Images are public.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Service title
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Category
          <Input required value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Description
        <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Location (optional)
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Starting price (NGN)
          <Input required min="0" type="number" inputMode="numeric" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What's included
          <Textarea value={included} onChange={(e) => setIncluded(e.target.value)} rows={4} placeholder="One item per line" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What the customer needs to provide
          <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={4} placeholder="One item per line" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Delivery expectations
        <Textarea value={delivery} onChange={(e) => setDelivery(e.target.value)} rows={2} placeholder="e.g. Quote within 24 hours; delivery within 5 working days" />
      </label>

      {message && (
        <Alert variant={message === 'Service updated.' || message === 'Image uploaded.' ? 'success' : 'error'}>{message}</Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={busy} size="lg">
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}