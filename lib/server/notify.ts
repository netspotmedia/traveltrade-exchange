import { createServiceClient } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/server/email'

// Events that always send regardless of preferences.
const MANDATORY_EVENTS = new Set(['withdrawal', 'refund', 'security'])

export interface NotifyOptions {
  userId: string
  title: string
  body: string
  event?: string
  email?: boolean
}

export async function sendNotification(input: NotifyOptions): Promise<void> {
  // Service-role client: notifications are written for *other* users (e.g.
  // an admin notifying an agency owner), which the per-user notification RLS
  // would otherwise block, and the recipient's email is read from
  // auth.users via the admin API (service-role only). Never expose this key
  // to the browser.
  const supabase = createServiceClient()

  // 1. Create the in-app notification.
  await supabase.from('notifications').insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
  })

  // 2. Email: skip unless requested; respect preferences for non-mandatory events.
  const wantsEmail = input.email !== false
  const event = input.event ?? 'general'
  if (!wantsEmail) return

  // Look up the user's email + preference.
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('email')
    .eq('user_id', input.userId)
    .eq('event', event)
    .maybeSingle()

  const enabled = MANDATORY_EVENTS.has(event) ? true : (pref?.email ?? true)
  if (!enabled) return

  // We need the actual email address; Supabase auth users store it in auth.users.
  const { data: userData } = await supabase.auth.admin.getUserById(input.userId)
  const email = userData?.user?.email
  if (!email) return

  // Fire-and-forget; never blocks business logic.
  void dispatchEmail({
    to: email,
    subject: input.title,
    body: `${input.title}\n\n${input.body}`,
    dedupeKey: `${event}:${input.userId}:${input.title}`,
  }).catch(() => {})
}
