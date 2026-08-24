"use client"
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

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
    <section className="rounded-3xl border bg-card p-6">
      <h2 className="font-semibold">Messages</h2>
      <div className="mt-4 flex max-h-80 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p>{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {m.sender?.email || 'you'} · {new Date(m.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-4 flex gap-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm"
        />
        <Button type="submit" disabled={busy}>Send</Button>
      </form>
    </section>
  )
}
