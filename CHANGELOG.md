# Changelog

All notable changes to the **TravelTrade Exchange (TTX)** marketplace are documented here, grouped by the work-stream that produced them.

Format follows the common "what changed, why, files, verification" style. Migrations that must still be applied to the Supabase database are called out explicitly.

---

## 1. Landing page upgrade (hero + trust section)

Applied the `ttx-landing-upgrade` pass to the marketing homepage.

- **Hero signature visual** — added a decorative flight-route line: a dashed arc from a teal departure mark to an amber destination mark that draws itself in behind the floating service cards. GPU-safe (`stroke-dashoffset`/`transform`/`opacity` only), `aria-hidden`, respects the global `prefers-reduced-motion` guard.
  - `components/home/hero-marketplace.tsx` (`RouteLine`)
  - `app/globals.css` (`.route-line-draw`, `.route-line-plane`, `route-draw`, `route-mark-in`)
- **Trust & Safety bento** — replaced the 3-equal-column grid with an asymmetric layout: a dominant double-bezel navy card (ambient amber glow, accent icon chip, accent badge) spanning two rows, a stacked secondary card, and a wide amber-tinted "One clear record" strip. Breaks the repeated grid rhythm and gives amber real presence as a third brand color.
  - `app/(marketing)/page.tsx`

---

## 2. Full-upgrade diff (featured card, accent stars, about page)

Applied the `ttx-full-upgrade` diff.

- **Homepage spotlight card** — new `components/featured-service-card.tsx`: a horizontal featured treatment for the first service in "Popular services" (same `ServiceCardProps` data contract — real image, rating, price; not fabricated).
- **Star ratings → accent token** — replaced hardcoded `fill-amber-400 text-amber-400` with `fill-accent text-accent` across:
  - `components/service-card.tsx`
  - `components/home/hero-marketplace.tsx`
  - `app/(app)/dashboard/orders/[id]/review-form.tsx`
  - `app/(marketing)/agencies/[slug]/page.tsx`
  - `app/(marketing)/agents/page.tsx`
  - `app/(marketing)/marketplace/[slug]/page.tsx` (4 occurrences)
- **About page redesign** — hero glow, `Reveal`/`SectionHeader` adoption, editorial split (sticky statement + divided list) for the principles, and a homepage-matching `rounded-4xl` hero-scale CTA.
  - `app/(marketing)/about/page.tsx`
- **Notification bell** — added `relative` to the header bell link so the unread-count badge positions correctly.
  - `components/layout/global-header.tsx`
- **tsconfig** — excluded the `ttx-landing-upgrade` / `ttx-full-upgrade` scratch directories from the TypeScript build (`tsconfig.json`).

---

## 3. Workflow & logic audit — fixes round 1

Full audit of orders / escrow / proposals / requests / verification flows. Verified bugs fixed:

- **Instant orders were broken** — the "Order now" CTA never passed the agency id, so every instant order failed with "Invalid order details". Now `/api/orders` derives `agency_id` **server-side from the service** (same pattern as the quote flow), and the order page loads the service so the buyer sees a **locked price/title** instead of guessing the exact amount.
  - `app/api/orders/route.ts`
  - `app/(app)/orders/new/page.tsx`
  - `app/(app)/orders/new/order-form.tsx`
- **Card escrow double-funding** — `complete_customer_escrow` only guarded by payment reference, so two successful charges for one order double-credited escrow. Added a unique partial index (one pending card payment per order) plus a defensive order-level `escrow_ledger` check.
  - `supabase/migrations/20260826000000_escrow_funding_guards.sql` **(must be applied)**
- **Card funding bypassed the agreement gate** — the wallet path required both signatures before funding; the card path didn't. Card init now enforces the same signed-agreement gate.
  - `app/api/payments/escrow/initialize/route.ts`
- **Dead "Re-submit" milestone button** — UI offered re-submit on `submitted` milestones, but `submit_milestone` rejects them. Button now only shows on submittable states.
  - `app/(app)/dashboard/orders/[id]/escrow-actions.tsx`
- **Idempotency key regenerated per submit** — a fresh key each submit defeated duplicate-order protection. Now generated once per form mount.
  - `app/(app)/orders/new/order-form.tsx`
- **Reject-then-accept state** — a rejected/declined proposal could still be accepted (UI + API only blocked `accepted`). Now blocked in both.
  - `app/api/proposals/[id]/respond/route.ts`
  - `app/(app)/dashboard/orders/[id]/proposal-panel.tsx`

---

## 4. Workflow & logic audit — fixes round 2 (`ttx-fixes-1-2-5.patch`)

- **Sellers can open disputes** — the "Open dispute" action was buyer-only; now available to either party.
  - `app/(app)/dashboard/orders/[id]/escrow-actions.tsx`
- **Removed non-escrow order transitions** — legacy order-level `submit`/`approve` could mark an order `completed` without releasing escrow funds. Delivery and payout now happen only through the milestone RPCs that actually move money.
  - `app/api/escrow/route.ts`
- **Order creation dedupe** — `/api/orders` now returns the existing order when the same `idempotency_key` + buyer is submitted again, instead of failing on the unique constraint or creating a duplicate.
  - `app/api/orders/route.ts`

---

## 5. Workflow & logic audit — fixes round 3

Additional audit findings fixed:

- **Closed the open `/api/orders` surface** — orders now **require `serviceId`**; the agency and price are derived exclusively from the published instant-order service, so a direct POST can no longer mint a fundable order against an arbitrary agency at an arbitrary price.
  - `app/api/orders/route.ts`
- **Buyer counter-offers** — buyers can now negotiate price/timeline instead of only accept/reject:
  - New `proposals.created_by` column (backfilled to agency owner for existing seller proposals) and a `proposals_buyer_insert` RLS policy.
    - `supabase/migrations/20260826010000_buyer_counters.sql` **(must be applied)**
  - `/api/proposals` now authorizes both seller and buyer. Sellers define milestones directly; a buyer counter **rescales the seller's milestone breakdown proportionally** to the new fee so milestones always sum to `order.total_amount` (funding stays consistent).
  - Proposal panel: buyers get an **Accept / Counter offer / Reject** row on any seller proposal; `created_by` gates actions so no one can act on their own proposal.
    - `app/(app)/dashboard/orders/[id]/proposal-panel.tsx`
    - `app/(app)/dashboard/orders/[id]/page.tsx`
- **Milestone status humanized** — `escrow-actions.tsx` now renders the humanized status label via `statusInfo()` instead of the raw backend enum.
- **Pruned dead milestone `funded` state** — nothing ever set a milestone to `funded`; removed it from the check constraint, `submit_milestone` guard, `escrow-actions` submit logic, and `status.ts`.
  - `supabase/migrations/20260826020000_money_state_consistency.sql` **(must be applied)**
  - `lib/status.ts`
- **`refund_order_escrow` soft-delete** — added the missing `deleted_at is null` filter on the order lookup, matching every sibling money RPC (return contract preserved: `'refunded', v_remaining`).
  - `supabase/migrations/20260826020000_money_state_consistency.sql` **(must be applied)**

---

## 6. Security hardening — RPC identity (audit)

Critical external audit finding: the `security definer` RPCs (which bypass RLS) were granted `EXECUTE` to the `authenticated` role yet derived identity from **caller-supplied UUID arguments** instead of `auth.uid()`. Any logged-in session could call them directly from the client SDK and impersonate another user or an admin — mint wallet funds, self-approve payouts, approve/reject KYB/services, resolve disputes, or refund escrow.

- **RPC identity hardening** — every money- and admin-mutating RPC now derives the caller from `auth.uid()`:
  - Buyer/seller RPCs (`fund_escrow_from_wallet`, `release_milestone`, `submit_milestone`, `approve_milestone`, `request_withdrawal`) reject when `auth.uid() <>` the supplied actor.
  - Admin RPCs (`process_withdrawal`, `resolve_dispute`, `escalate_dispute`, `refund_order_escrow`, `review_verification_submission`, `admin_set_agency_credentials`, `admin_resolve_failed_callback`) check the admin role against `auth.uid()`.
  - `review_agency_kyb` / `review_service` gained an admin check they previously lacked entirely.
  - `supabase/migrations/20260826030000_rpc_identity_hardening.sql` **(must be applied)**
- **Webhook-only settlement RPCs → service role** — `credit_wallet_from_topup`, `complete_customer_escrow`, and `record_failed_callback` are revoked from `authenticated` and granted to `service_role` only (unreachable from the browser). The webhook/callback now run them via a new `createServiceClient()` (service-role client) in `lib/supabase/server.ts` — which also fixes the settlement path that previously ran as `anon` and would have failed the grants.
  - `lib/server/money.ts`, `app/api/payments/webhook/route.ts`
- **Admin routes consolidated** — all 9 `app/api/admin/**` routes now use the existing `requireAdmin()` helper instead of duplicating the inline role check.
- **Static regression test** — `lib/server/rpc-security.test.ts` parses the migrations and fails if any mutating RPC loses its `auth.uid()` guard or a webhook-only RPC is re-granted to `authenticated`.

---

## 7. Workflow gaps — email pipeline, order cancellation, verification consolidation, admin audit-log

Follow-up audit findings addressed:

- **Notification/email pipeline was silently broken** — `sendNotification()` used the **anon/publishable** client for `auth.admin.getUserById()` (service-role only), so the email lookup always failed silently, and the notification insert was RLS-blocked when notifying *other* users (e.g. an admin → agency owner). `dispatchEmail()`/`retryEmail()` also wrote to `email_logs` (RLS: no client write policies) under the anon client, so no email was ever logged or sent.
  - Fixed by routing all notification/email writes through the **service-role client**: `lib/server/notify.ts`, `lib/server/email.ts`, and the cron worker (`app/api/cron/emails/route.ts` now reuses the shared `createServiceClient()`).
- **Order-cancellation path for unfunded orders** — `proposed` orders that never get funded (quote not accepted, instant order never paid) had no close-out path and lingered forever. Added a `cancel` transition (`proposed → cancelled`) to the escrow API (marks any agreement `cancelled`) and a "Cancel order" button for either party on a `proposed` order.
  - `app/api/escrow/route.ts`, `app/(app)/dashboard/orders/[id]/escrow-actions.tsx`
- **Verification systems consolidated** — agency verification now goes through a single system (`verification_submissions` + `review_verification_submission`, used by the agent verification page and admin Verification page). Removed the legacy `review_agency_kyb` / `admin_set_agency_credentials` RPCs (dropped by migration), the `/api/admin/kyb/review` route, `KybReviewActions`, and the admin dashboard "Pending agency KYB" panel. `kyc_documents` remains in the schema (onboarding still uploads document evidence) but is no longer reviewed through the legacy RPCs.
  - `supabase/migrations/20260826040000_drop_legacy_kyb_rpcs.sql` **(must be applied)**
  - `lib/server/rpc-security.test.ts` updated (removed the two dropped RPCs from the guarded list).
- **Admin content edits are now audited** — added `logAudit()` to the CMS and branding routes (`app/api/admin/cms/route.ts`, `app/api/admin/branding/route.ts`), matching the existing pattern on verification/service/dispute review routes.

---

## Pending migrations

Apply these to the Supabase database in order before relying on the affected features:

1. `supabase/migrations/20260826000000_escrow_funding_guards.sql` — card escrow single-pending-payment guard + defensive funding check.
2. `supabase/migrations/20260826010000_buyer_counters.sql` — `proposals.created_by` + buyer insert RLS (required for buyer counter-offers).
3. `supabase/migrations/20260826020000_money_state_consistency.sql` — milestone `funded` state removal + `refund_order_escrow` soft-delete filter.
4. `supabase/migrations/20260826030000_rpc_identity_hardening.sql` — `auth.uid()` guards on all money/admin RPCs + service-role-only settlement grants. **Requires `SUPABASE_SERVICE_ROLE_KEY` to be set on the deployed environment** (needed by the Paystack webhook/callback for settlement).
5. `supabase/migrations/20260826040000_drop_legacy_kyb_rpcs.sql` — drops the legacy `review_agency_kyb` / `admin_set_agency_credentials` RPCs.

---

## Flagged, intentionally deferred

These were confirmed in code but left for a larger design pass (not bug fixes):

- **Partial-split dispute/refund settlement** — `resolve_dispute()` / `refund_order_escrow()` settle 100% to one side only; no partial split (e.g. "release 60% / refund 40%"). Recommended for the first non-trivial real dispute.
- **Paystack account resolution for withdrawals** — bank details are free-text with no `resolve-account` check before submission; a resolution step would cut failed payouts at scale.
- **`parentProposalId` validation** — `/api/proposals` marks the referenced proposal `countered` without verifying it belongs to the same order/agency (low severity).
- **Dead `fundMilestone` branch** — `app/api/escrow/route.ts` still accepts the action string but always returns "Invalid action" (no such RPC exists).
- **Duplicate `/api/payments/initialize`** — wallet top-up endpoint is shadowed by the working `/api/wallet` path; latent footgun if ever wired up.

---

## Verification

- `npm run build` — passes (TypeScript clean, all routes build).
- `npm test` — passes (`lib/server/workflows.test.ts` + `lib/server/rpc-security.test.ts`, 10 tests).
- Production build was also run successfully for the marketing/landing changes.