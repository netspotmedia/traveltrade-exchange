'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { compactMoney, monthDelta } from '@/lib/dashboard'

interface PerformanceChartProps {
  /** 12 monthly buckets — the range toggle slices the trailing window. */
  data: { label: string; value: number }[]
  currency?: string | null
}

const PERIODS = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
] as const

const W = 640
const H = 240
const PAD = { left: 46, right: 16, top: 18, bottom: 30 }

/** Lightweight custom-SVG escrow volume chart — gradient area, drawn-in
 *  line, hover readout and a 3/6/12-month window toggle. No chart library. */
export function PerformanceChart({ data, currency }: PerformanceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[1])
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const series = useMemo(() => data.slice(-period.months), [data, period])

  const chart = useMemo(() => {
    const values = series.map((p) => p.value)
    const yMax = Math.max(1, ...values) * 1.18
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const step = series.length > 1 ? plotW / (series.length - 1) : 0
    const points = series.map((p, i) => ({
      x: PAD.left + step * i,
      y: PAD.top + (1 - p.value / yMax) * plotH,
      ...p,
    }))
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`
    const grid = [0, 0.5, 1].map((f) => ({ y: PAD.top + plotH * (1 - f), label: compactMoney(yMax * f, currency) }))
    return { points, line, area, yMax, grid }
  }, [series, currency])

  const total = series.reduce((s, p) => s + p.value, 0)
  const delta = monthDelta(data)
  const showDelta = period.months <= 6

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || series.length === 0) return
    const rect = svg.getBoundingClientRect()
    const scale = W / rect.width
    const x = (e.clientX - rect.left) * scale
    const step = series.length > 1 ? (W - PAD.left - PAD.right) / (series.length - 1) : 0
    const idx = Math.round((x - PAD.left) / step)
    setActive(Math.max(0, Math.min(series.length - 1, idx)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-eyebrow text-on-surface-variant">Escrow volume</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="font-display text-3xl font-semibold tracking-tight text-primary">{compactMoney(total, currency)}</p>
            {showDelta && delta !== null && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
                  delta >= 0 ? 'bg-primary-fixed/50 text-primary' : 'bg-warning text-on-secondary-container',
                )}
              >
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">Funds secured across active trades, last {period.months} months</p>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-surface-container-low p-1" role="group" aria-label="Chart period">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={period.months === p.months}
              onClick={() => {
                setPeriod(p)
                setActive(null)
              }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200',
                period.months === p.months ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'text-on-surface-variant hover:text-primary',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Escrow volume chart"
          onPointerMove={handleMove}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id="vol-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#95d3ba" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#95d3ba" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="vol-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#003527" />
              <stop offset="100%" stopColor="#80bea6" />
            </linearGradient>
            <clipPath id="plot-clip">
              <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} rx="14" />
            </clipPath>
          </defs>

          {/* Grid + axis labels */}
          {chart.grid.map((g, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={g.y} y2={g.y} stroke="#bfc9c3" strokeOpacity="0.45" strokeDasharray="3 5" />
              <text x={PAD.left - 8} y={g.y + 3} textAnchor="end" className="fill-on-surface-variant" fontSize="10" fontWeight="600">
                {g.label}
              </text>
            </g>
          ))}

          <g clipPath="url(#plot-clip)">
            {/* Area */}
            <path d={chart.area} fill="url(#vol-fill)" className={cn('transition-opacity duration-700', mounted ? 'opacity-100' : 'opacity-0')} />

            {/* Drawn-in line */}
            <path
              d={chart.line}
              fill="none"
              stroke="url(#vol-line)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: mounted ? 0 : 1,
                transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)',
              }}
            />

            {/* Points */}
            {chart.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={active === i ? 5.5 : 3}
                fill="#fff"
                stroke={active === i ? '#003527' : '#95d3ba'}
                strokeWidth="2.5"
                className="transition-all duration-200"
              />
            ))}

            {/* Hover guide + readout */}
            {active !== null && chart.points[active] && (
              <g>
                <line
                  x1={chart.points[active].x}
                  x2={chart.points[active].x}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="#003527"
                  strokeOpacity="0.25"
                  strokeDasharray="2 3"
                />
                {(() => {
                  const p = chart.points[active]
                  const isRight = p.x > W - 130
                  const bw = 118
                  const bh = 40
                  const bx = isRight ? p.x - bw - 14 : p.x + 14
                  const by = Math.max(PAD.top, p.y - bh / 2)
                  return (
                    <g>
                      <rect x={bx} y={by} width={bw} height={bh} rx={10} fill="#ffffff" fillOpacity="0.95" stroke="#d8e3fb" />
                      <text x={bx + 12} y={by + 16} fontSize="10" fontWeight="600" className="fill-on-surface-variant">
                        {p.label}
                      </text>
                      <text x={bx + 12} y={by + 31} fontSize="13" fontWeight="700" className="fill-primary">
                        {compactMoney(p.value, currency)}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )}
          </g>
        </svg>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-surface-variant to-transparent" />
      </div>
    </div>
  )
}