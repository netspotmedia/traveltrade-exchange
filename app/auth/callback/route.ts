import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  const origin = url.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    // If there was a session already (recovery link), exchange may not be needed.
    if (error && error.message.includes('session')) {
      // ignore; a session may already exist from the recovery link
    }
  }

  // Redirect to the requested path (e.g. /auth/reset-password after recovery).
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(new URL(safeNext, origin))
}
