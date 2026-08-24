import { createClient } from '@/lib/supabase/server'
import { jsonError } from '@/lib/server/workflows'

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

export async function rateLimit(
  bucket: string,
  limit = 30,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rate_limit_check', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    // If the RPC is missing/unavailable, fail open for reads but log.
    return { allowed: true }
  }
  return { allowed: data === true }
}

export function rateLimitError() {
  return jsonError('Too many requests. Please try again shortly.', 429)
}
