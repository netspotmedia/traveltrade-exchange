"use client"
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  order_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
  sender?: { email?: string; full_name?: string | null } | null
}

export function MessageThread({ orderId, currentUserId }: { orderId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function load() {
    const r = await fetch(`/api/orders/${orderId}/messages`)
    if (r.ok) {
      const j = await r.json()
      setMessages(j.messages ?? [])
    }
  }

  useEffect(() => {
    load()
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
      channelRef.current = supabase
        .channel(`order_messages:${orderId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, () => load())
        .subscribe()
    } catch {
      // fall back to polling
    }
    const interval = window.setInterval(load, 10000)
    return () => {
      window.clearInterval(interval)
      try {
        supabase?.removeChannel(channelRef.current!)
      } catch {}
    }
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true)
    try {
      const r = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })
      if (r.ok) {
        const j = await r.json()
        setMessages((prev) => [...prev, j.message])
        setDraft('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Messages</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Chat with your travel partner about this order.</p>
      </div>

      <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'flex max-w-[78%] flex-col gap-1 rounded-2xl px-4 py-2 text-sm shadow-card',
                  mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p className={cn('text-[11px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {m.sender?.email || (mine ? 'You' : 'Partner')} · {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2.5 border-t border-border p-4">
        <label htmlFor={`msg-${orderId}`} className="sr-only">
          Write a message
        </label>
        <input
          id={`msg-${orderId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
        />
        <Button type="submit" disabled={busy} className="h-11 px-5">
          Send
        </Button>
      </form>
    </section>
  )
}