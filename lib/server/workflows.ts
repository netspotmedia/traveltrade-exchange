import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function requireAdmin() {
  const result = await requireUser()
  if (!result.user) return { ...result, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  const { data: profile } = await result.supabase.from('profiles').select('role').eq('id', result.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { ...result, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  return { ...result, response: null }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function cleanText(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function validAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 && amount <= 100_000_000 ? Math.round(amount * 100) / 100 : null
}
