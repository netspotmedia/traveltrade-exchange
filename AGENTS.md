# TravelTrade Exchange - Development Guide

## Build & Check Commands
```bash
# Type check
pnpm exec tsc --noEmit

# Production build
pnpm exec next build

# Design detector (no violations = clean)
node ".opencode/skills/impeccable/scripts/detect.mjs"
```

## Tech Stack
- Next.js 16.3 + React 19 + Tailwind CSS 4 + shadcn + Supabase + pnpm
- Light-only (no dark mode), role-aware nav (buyer/seller/admin)

## Design System
- M3 green/gold palette (`#003527` primary, `#735c00` secondary)
- Fonts: Fraunces (headings `font-display`) + Plus Jakarta Sans (body) + Hanken Grotesk (M3 dashboard) + system monospace (`font-mono`)
- Glass panels on `bg-canvas` (#f8fafc) grid
- **Glass CSS**: `.glass-panel` and `.glass-card` are global (not `.m3` scoped)
- **Glass-card transition**: `cubic-bezier(0.16, 1, 0.3, 1)` — NOT `ease`
- Component shadows: `shadow-lg shadow-primary-container/20`, hover: `hover:shadow-xl`
- Buttons: `bg-primary text-on-primary shadow-lg shadow-primary-container/20`
- Button radius: `rounded-lg` (consistent across all CTA buttons)
- **No `opacity-90`/`opacity-95` on hover** — use `hover:shadow-xl` instead
- **No bare `transition`** — always `transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]`
- **No `text-primary-foreground`** on bg-primary buttons — use `text-on-primary`
- **No `min-h-screen`** on marketing heroes — use `min-h-[100dvh]`
- All headings must have `font-display` class

## Key Files
- `app/globals.css`: Glass system + tokens + font-mono
- `components/ui/button.tsx`: Button component (shadow-lg, custom easing)
- `components/dashboard/panel.tsx`: Panel, SectionTitle, rowMotion
- `components/dashboard/page-header.tsx`: PageHeader (serif, text-primary)
- `components/layout/app-shell.tsx`: App shell with grain overlay
- `components/layout/header-bar.tsx`: Marketing header (glass nav, pill CTAs)
- `components/layout/mobile-menu.tsx`: Mobile menu (glass dropdown)
- `app/(marketing)/layout.tsx`: Marketing layout (no `.m3` scope)
- `app/(app)/layout.tsx`: App layout (`.m3` scope)

## Verification Checklist
1. `pnpm exec tsc --noEmit` — zero errors
2. `pnpm exec next build` — clean build
3. `node ".opencode/skills/impeccable/scripts/detect.mjs"` — empty output

## Anti-Patterns (Never Do These)
- `hover:opacity-90` or `hover:opacity-95` → use `hover:shadow-xl`
- `shadow-card` → use `shadow-lg shadow-primary-container/20`
- `bg-card` → use `glass-card` or `glass-panel`
- `surface-soft` → removed, use glass classes
- `text-primary-foreground` on filled buttons → use `text-on-primary`
- `transition` without duration/easing → use `transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]`
- `min-h-screen` on marketing heroes → use `min-h-[100dvh]`
- Headings without `font-display` → always add `font-display`
