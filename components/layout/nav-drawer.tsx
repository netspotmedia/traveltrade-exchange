'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface NavDrawerProps {
  label: React.ReactNode
  /** Rendered inside the slide-in drawer (server content is fine — it is
   *  passed through as serialised children). */
  children: React.ReactNode
}

/** Slide-in navigation drawer for the app's mobile header. Locks scroll
 *  while open, closes on Escape / backdrop tap, and animates with the
 *  system ease-out curve. */
export function NavDrawer({ label, children }: NavDrawerProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full text-primary transition-colors hover:bg-surface-container-high"
      >
        {label}
      </button>

      <div aria-hidden={!open} className={cn('fixed inset-0 z-[60]', open ? 'pointer-events-auto' : 'pointer-events-none')}>
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          autoFocus={open}
          onClick={() => setOpen(false)}
          className={cn('absolute inset-0 bg-primary/25 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={cn(
            'absolute left-0 top-0 flex h-full w-80 max-w-[86vw] flex-col border-r border-white/10 bg-surface-container-low/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {children}
        </div>
      </div>
    </>
  )
}