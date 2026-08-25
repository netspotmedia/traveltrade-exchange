"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function ReviewForm({ orderId, hasReview }: { orderId: string; hasReview: boolean }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) return setMessage({ kind: 'err', text: 'Please pick a star rating.' })
    setBusy(true)
    setMessage(null)
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment }),
      })
      const j = await r.json()
      if (!r.ok) return setMessage({ kind: 'err', text: j.error || 'Unable to submit review' })
      setMessage({ kind: 'ok', text: 'Thanks! Your review has been posted.' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (hasReview) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold">Review</h2>
        <p className="mt-2 text-sm text-muted-foreground">You've already reviewed this order. Thanks for sharing your experience.</p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <h2 className="text-lg font-semibold">Leave a review</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your feedback helps other travellers choose with confidence.</p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <fieldset>
          <legend className="sr-only">Star rating</legend>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1
              const active = value <= (hover || rating)
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={value === rating}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHover(value)}
                  className="p-1"
                >
                  <Star className={cn('size-7 transition', active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Your review (optional)
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="How was the service? What went well?" />
        </label>

        {message && (
          <Alert variant={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</Alert>
        )}

        <Button type="submit" disabled={busy || rating < 1} className="w-fit">
          {busy ? 'Posting…' : 'Post review'}
        </Button>
      </form>
    </section>
  )
}