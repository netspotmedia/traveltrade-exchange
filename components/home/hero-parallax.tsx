'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeroParallaxProps {
  children: React.ReactNode
  className?: string
  /** Entrance delay in ms (staggered with sibling content). */
  delay?: number
  /** px of vertical drift per 100px scrolled (subtle only). */
  speed?: number
}

/** Entrance + gentle scroll parallax for hero visuals. GPU-only (transform +
 *  opacity), fully disabled under prefers-reduced-motion. */
export function HeroParallax({ children, className, delay = 0, speed = 0.05 }: HeroParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setVisible(true)
    if (reduce) return

    const frame = requestAnimationFrame(() => setVisible(true))
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setOffset(window.scrollY * speed)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [speed])

  return (
    <div
      ref={ref}
      style={{
        transform: offset ? `translateY(${offset}px)` : undefined,
        transitionDelay: visible ? `${delay}ms` : undefined,
      }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}