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

// Returns the user's verified agency if they are an approved seller,
// otherwise a response indicating they must complete onboarding.
export async function requireVerifiedAgent() {
  const result = await requireUser()
  if (!result.user) return { ...result, agency: null, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  const { data: agency } = await result.supabase
    .from('agencies')
    .select('id, verification_status')
    .eq('owner_id', result.user.id)
    .maybeSingle()
  if (!agency || agency.verification_status !== 'verified') {
    return { ...result, agency: null, response: NextResponse.json({ error: 'Agency verification required' }, { status: 403 }) }
  }
  return { ...result, agency, response: null }
}

// Returns true if the user's email is confirmed/verified.
// Email confirmation may be disabled in Supabase, in which case users are
// considered verified (email_confirmed_at is set automatically on signup).
export function isEmailVerified(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null): boolean {
  if (!user) return false
  // If confirmation is disabled, Supabase marks the email as confirmed.
  return Boolean(user.email_confirmed_at || user.confirmed_at)
}

// Gate financial/messaging actions on a verified email.
// Returns a JSON error response when the email is not verified, else null.
export async function requireVerifiedEmail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Authentication required', 401)
  if (!isEmailVerified(user)) {
    return jsonError('Please verify your email to continue', 403)
  }
  return null
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
