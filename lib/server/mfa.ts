import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export function mfaEnforced() {
  return process.env.NEXT_PUBLIC_MFA_ENFORCED === 'true'
}

// Returns true if the user has MFA configured (an aal2-verified factor).
export async function userHasMfa(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return false
  return (data?.all ?? []).some((f) => f.status === 'verified')
}

// Gate: if MFA is enforced and the user lacks MFA, block the action.
export async function mfaGate() {
  if (!mfaEnforced()) return null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!(await userHasMfa(user.id))) {
    return NextResponse.json({ error: 'MFA is required to continue', code: 'MFA_REQUIRED' }, { status: 403 })
  }
  return null
}
