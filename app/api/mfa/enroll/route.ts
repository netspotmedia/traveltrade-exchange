import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitError } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const allowed = await rateLimit(`mfa_enroll:${user.id}`, 10, 300)
  if (!allowed.allowed) return rateLimitError()

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const factorId = data.id
  const qr = `otpauth://totp/TravelTrade%20Exchange:${encodeURIComponent(user.email ?? user.id)}?secret=${data.totp?.qr_code ?? ''}&issuer=TravelTrade%20Exchange`

  return NextResponse.json({
    factorId,
    qrCode: data.totp?.qr_code ?? null,
    secret: data.totp?.secret ?? null,
    provisioningUri: qr,
  })
}
