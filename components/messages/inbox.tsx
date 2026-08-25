'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquareText } from 'lucide-react'
import { MessageThread } from '@/components/messages/message-thread'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface InboxConversation {
  orderId: string
  orderTitle: string
  orderStatus: string
  otherParty: string
  latestBody: string | null
  latestAt: string | null
  unread: number
}

interface InboxProps {
  conversations: InboxConversation[]
  currentUserId: string
  /** When set, this conversation's thread is opened (deep link). */
  activeOrderId?: string | null
}

/** Two-pane messages inbox — conversation list + active thread (TTX Next style). */
export function MessagesInbox({ conversations, currentUserId, activeOrderId }: InboxProps) {
  const [activeId, setActiveId] = useState<string | null>(activeOrderId ?? conversations[0]?.orderId ?? null)
  const active = conversations.find((c) => c.orderId === activeId) ?? null

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className={cn('flex flex-col gap-2', activeId ? 'hidden lg:flex' : 'flex')}>
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-12 text-center">
            <MessageSquareText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">When you message a travel partner inside an order, it appears here.</p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              Find a service
            </Link>
          </div>
        ) : (
          <>
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversations</h2>
            {conversations.map((c) => {
              const isActive = c.orderId === activeId
              return (
                <button
                  key={c.orderId}
                  type="button"
                  onClick={() => setActiveId(c.orderId)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    isActive ? 'border-primary/40 bg-primary-soft' : 'border-border bg-card shadow-card hover:-translate-y-0.5 hover:shadow-lift',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.orderTitle}</p>
                    {c.unread > 0 && (
                      <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.otherParty}</span>
                    {c.latestBody && <> · {c.latestBody}</>}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <StatusBadge domain="order" status={c.orderStatus} />
                    {c.latestAt && <span className="text-[11px] text-muted-foreground">{formatDateTime(c.latestAt)}</span>}
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* Active thread */}
      <div className={cn(activeId ? 'block' : 'hidden lg:block')}>
        {active ? (
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {/* Mobile back button */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 lg:hidden">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              <span className="ml-1 truncate text-sm font-semibold">{active.orderTitle}</span>
            </div>
            {/* Desktop header */}
            <div className="hidden items-center justify-between gap-3 border-b border-border px-5 py-3 lg:flex">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{active.orderTitle}</p>
                <p className="truncate text-xs text-muted-foreground">with {active.otherParty}</p>
              </div>
              <StatusBadge domain="order" status={active.orderStatus} />
            </div>
            <MessageThread orderId={active.orderId} currentUserId={currentUserId} scrollClassName="h-[calc(100dvh-18rem)] min-h-[26rem]" />
          </div>
        ) : (
          <div className="grid h-[calc(100dvh-16rem)] min-h-[26rem] place-items-center rounded-2xl border border-dashed border-border bg-background/60 text-sm text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}