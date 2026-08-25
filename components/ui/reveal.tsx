'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Delay in ms before the element animates in (for staggered groups). */
  delay?: number
  /** Direction of the entrance. */
  from?: 'up' | 'none'
  as?: 'div' | 'section' | 'li' | 'article'
}

/** Scroll-reveal entrance — fades content up into view once, using only
 *  transform + opacity, respecting prefers-reduced-motion. Never animates
 *  layout properties, so it cannot cause reflow or CLS. */
export function Reveal({ children, className, delay = 0, from = 'up', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        from === 'up' ? 'translate-y-6' : '',
        'opacity-0',
        shown && 'translate-y-0 opacity-100',
        className,
      )}
    >
      {children}
    </Tag>
  )
}