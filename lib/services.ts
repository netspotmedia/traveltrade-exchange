import type { SupabaseClient } from '@supabase/supabase-js'

// Generates a unique, URL-safe slug for a service title.
export async function uniqueSlug(supabase: SupabaseClient, base: string): Promise<string> {
  const root = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service'
  let slug = root
  let attempt = 0
  for (;;) {
    const { data } = await supabase.from('services').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    attempt += 1
    slug = `${root}-${attempt}`
  }
}

export function sanitizeText(value: unknown, max = 5000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

export function sanitizeStringList(value: unknown, maxItems = 20, maxLen = 500): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim().slice(0, maxLen) : ''))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function sanitizeFaqs(value: unknown, maxItems = 10): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return []
  const out: { question: string; answer: string }[] = []
  for (const item of value) {
    const q = sanitizeText((item as { question?: unknown })?.question, 300)
    const a = sanitizeText((item as { answer?: unknown })?.answer, 2000)
    if (q && a) out.push({ question: q, answer: a })
    if (out.length >= maxItems) break
  }
  return out
}

// Sanitizes the structured "details" payload. Returns null when nothing meaningful.
export function sanitizeDetails(value: unknown): { included: string[]; requirements: string[]; delivery: string | null } | null {
  if (!value || typeof value !== 'object') return null
  const details = value as { included?: unknown; requirements?: unknown; delivery?: unknown }
  const included = sanitizeStringList(details.included)
  const requirements = sanitizeStringList(details.requirements)
  const delivery = sanitizeText(details.delivery, 2000)
  if (included.length === 0 && requirements.length === 0 && !delivery) return null
  return { included, requirements, delivery }
}