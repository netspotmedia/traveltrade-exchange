import { createClient } from '@/lib/supabase/server'

/** Append an audit-log entry. Fire-and-forget; never blocks the action. */
export async function logAudit(
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = await createClient()
  try {
    await supabase.rpc('log_audit', {
      p_action: action,
      p_entity_type: entityType ?? null,
      p_entity_id: entityId ?? null,
      p_metadata: metadata,
    })
  } catch {
    // Never let audit logging break the underlying action.
  }
}