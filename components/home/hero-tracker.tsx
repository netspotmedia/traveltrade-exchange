"use client"

import { useEffect } from 'react'
import { track } from '@vercel/analytics'

// Fires a Vercel Analytics event when a visitor is shown a hero variant.
export function HeroTracker({ variant }: { variant: 'a' | 'b' }) {
  useEffect(() => {
    track('hero_impression', { variant })
  }, [variant])

  return null
}