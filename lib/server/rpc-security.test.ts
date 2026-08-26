import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Static regression guard for the RPC identity-hardening pass.
//
// These functions are `security definer` (they bypass RLS), so a caller-
// supplied UUID argument must never be the source of truth for who the
// actor is. Every mutating RPC must derive identity from auth.uid(), and the
// webhook-only settlement RPCs must be restricted to the service role.
//
// This test parses the migration files (the last definition/grant wins) and
// fails if a future change reintroduces the trust gap — no live database
// needed.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

function allMigrations(): string {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  return files.map((f) => readFileSync(join(migrationsDir, f), 'utf8')).join('\n')
}

/** Extract the body of the LAST `create or replace function public.<name>` block. */
function finalFunctionDefinition(sql: string, name: string): string {
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, 'g')
  const matches = [...sql.matchAll(re)]
  if (matches.length === 0) return ''
  const start = matches[matches.length - 1].index
  const next = sql.indexOf('create or replace function public.', start + 1)
  const end = next === -1 ? sql.length : next
  return sql.slice(start, end)
}

/** Compute the net EXECUTE grant target for a function after applying every
 *  grant/revoke in order (the last statement wins). */
function finalExecuteRole(sql: string, name: string): string {
  const re = new RegExp(
    `(grant|revoke)\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^;]*?\\)\\s+(to|from)\\s+(\\w+)`,
    'g',
  )
  let current: string | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(sql)) !== null) {
    current = m[1] === 'grant' ? m[3] : null
  }
  return current ?? '(none)'
}

// Every RPC that mutates money or admin state must derive the caller's
// identity from auth.uid() — never trust a caller-supplied actor UUID.
// (review_agency_kyb / admin_set_agency_credentials were removed in favour
// of review_verification_submission, so they are no longer guarded here.)
const MUST_GUARD = [
  'fund_escrow_from_wallet',
  'release_milestone',
  'submit_milestone',
  'approve_milestone',
  'request_withdrawal',
  'process_withdrawal',
  'resolve_dispute',
  'escalate_dispute',
  'refund_order_escrow',
  'review_service',
  'review_verification_submission',
  'admin_resolve_failed_callback',
]

// Webhook-only settlement RPCs: no user session exists on the webhook, so
// they must run under the service role and be unreachable from the browser.
const SERVICE_ROLE_ONLY = ['credit_wallet_from_topup', 'complete_customer_escrow', 'record_failed_callback']

describe('RPC identity hardening (static)', () => {
  const sql = allMigrations()

  it('guards every money- and admin-mutating RPC with auth.uid()', () => {
    for (const name of MUST_GUARD) {
      const def = finalFunctionDefinition(sql, name)
      expect(def.length, `${name} should have a definition`).toBeGreaterThan(0)
      expect(def, `${name} must derive the actor from auth.uid()`).toContain('auth.uid()')
    }
  })

  it('restricts webhook-only settlement RPCs to the service role', () => {
    for (const name of SERVICE_ROLE_ONLY) {
      expect(finalExecuteRole(sql, name), `${name} must not be callable by authenticated`).toBe('service_role')
    }
  })

  it('explicitly revokes authenticated EXECUTE for webhook-only settlement RPCs', () => {
    // The original migrations granted these to `authenticated`; the hardening
    // migration must carry the matching revoke (not just a later grant), so
    // the client SDK cannot call them even if a role re-grant is reordered.
    for (const name of SERVICE_ROLE_ONLY) {
      const re = new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^;]*?\\)\\s+from\\s+authenticated`, 'g')
      expect(sql.match(re) ?? [], `${name} must have an explicit revoke from authenticated`).not.toHaveLength(0)
    }
  })
})