'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Search, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusInfo } from '@/lib/status'
import { formatMoney } from '@/lib/format'
import { TRADE_STAGES, stageFor, stageFraction, tradeIcon, type TradeRow } from '@/lib/dashboard'

interface TradesPanelProps {
  trades: TradeRow[]
  viewAllHref: string
  createHref: string
}

type Filter = 'all' | 'attention' | 'escrow'

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'escrow', label: 'In escrow' },
]

const STATUS_PILL: Record<string, string> = {
  warning: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-primary-fixed/40 text-primary',
  success: 'bg-primary-fixed text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

/** Interactive Active Trades panel — role-aware filters, live search and
 *  expandable milestone rows. Server renders the rows; this owns state. */
export function TradesPanel({ trades, viewAllHref, createHref }: TradesPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      all: trades.length,
      attention: trades.filter((t) => t.needsAttention).length,
      escrow: trades.filter((t) => t.status === 'funded' || t.status === 'in_progress').length,
    }),
    [trades],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trades.filter((t) => {
      if (filter === 'attention' && !t.needsAttention) return false
      if (filter === 'escrow' && t.status !== 'funded' && t.status !== 'in_progress') return false
      if (q && !`${t.id} ${t.title} ${t.partner}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [trades, filter, query])

  return (
    <div className="glass-panel flex flex-col rounded-3xl p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-tight text-primary">Active Trades</h3>
        <Link href={viewAllHref} className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          View all
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Filters + search */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter trades">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200',
                filter === f.key ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-primary',
              )}
            >
              {f.label}
              {counts[f.key] > 0 && <span className={cn('rounded-full px-1.5 text-[10px] font-bold', filter === f.key ? 'bg-on-secondary-container/15' : 'bg-surface-container-high')}>{counts[f.key]}</span>}
            </button>
          ))}
        </div>

        <label className="relative block w-full sm:w-56">
          <span className="sr-only">Search trades</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trades…"
            className="w-full rounded-full border border-white/30 bg-surface-container-low/70 py-2 pl-9 pr-8 text-sm text-on-surface outline-none backdrop-blur-sm transition placeholder:text-on-surface-variant/70 focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      {/* Rows */}
      <div className="mt-5 flex flex-col gap-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary-fixed-dim/60 bg-surface-container-low/50 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary-fixed/30 text-primary" aria-hidden="true">
              <ShieldAlert className="size-6" />
            </span>
            <div>
              <p className="font-semibold text-primary">No trades here</p>
              <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{query || filter !== 'all' ? 'Try adjusting your filters or search.' : 'Start a trade request and it will appear here.'}</p>
            </div>
            {!query && filter === 'all' && (
              <Link href={createHref} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:opacity-90">
                New trade request <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          visible.map((t, i) => (
            <div key={t.id} className="row-in" style={{ animationDelay: `${Math.min(i * 45, 225)}ms` }}>
              <TradeRowView trade={t} expanded={expanded === t.id} onToggle={() => setExpanded(expanded === t.id ? null : t.id)} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TradeRowView({ trade, expanded, onToggle }: { trade: TradeRow; expanded: boolean; onToggle: () => void }) {
  const Icon = tradeIcon(trade.title)
  const stage = stageFor(trade.status)
  const fill = stageFraction(trade.status)
  const info = statusInfo('order', trade.status)
  const disputed = trade.status === 'disputed'
  const premium = trade.amount >= 250_000

  return (
    <div className={cn('glass-card rounded-xl overflow-hidden transition-all duration-300', expanded && 'ring-1 ring-primary-fixed-dim/60')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-white/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-container text-primary" aria-hidden="true">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-primary">{trade.id}</span>
              {premium && <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-secondary-fixed">Premium</span>}
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_PILL[info.tone])}>{info.label}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-on-surface-variant">{trade.title}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
          <div className="flex w-full items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-0">
            <span className="font-display text-lg font-semibold tracking-tight text-primary">{formatMoney(trade.amount, trade.currency)}</span>
            <ChevronDown className={cn('size-4 text-on-surface-variant transition-transform duration-300', expanded && 'rotate-180')} aria-hidden="true" />
          </div>
          <div className="w-full sm:w-56">
            <div
              role="progressbar"
              aria-label={`${trade.id} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fill * 100)}
              className="relative h-2 w-full overflow-hidden rounded-full bg-surface-container-low"
            >
              <div
                className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]', disputed ? 'bg-secondary' : 'bg-gradient-to-r from-primary to-primary-fixed-dim')}
                style={{ width: `${Math.max(fill * 100, stage > 0 ? 8 : 0)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">
              {TRADE_STAGES.map((label, i) => {
                const reached = i < stage
                const current = i === stage - 1
                return (
                  <span key={label} className={cn(reached || current ? 'text-primary' : '', disputed && current && 'text-secondary')}>
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="animate-in border-t border-white/40 bg-white/40 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{trade.hint}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Started {new Date(trade.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <Link
              href={`/dashboard/orders/${trade.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:opacity-90 active:scale-[0.98]"
            >
              Open order <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}