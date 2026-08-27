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
- Fonts: Noto Serif (headings `font-display`) + Hanken Grotesk (body)
- Glass panels on `bg-canvas` (#f8fafc) grid
- **Glass CSS**: `.glass-panel` and `.glass-card` are global (not `.m3` scoped)
- Component shadows: `shadow-lg shadow-primary-container/20`, hover: `hover:shadow-xl`
- Buttons: `bg-primary text-on-primary`, no `opacity-90` on hover

## Key Files
- `app/globals.css`: Glass system + tokens
- `components/dashboard/panel.tsx`: Panel, SectionTitle, rowMotion
- `components/dashboard/page-header.tsx`: PageHeader (serif, text-primary)
- `components/layout/app-shell.tsx`: App shell with grain overlay
- `app/(marketing)/layout.tsx`: Marketing layout (no `.m3` scope)
- `app/(app)/layout.tsx`: App layout (`.m3` scope)

## Verification Checklist
1. `pnpm exec tsc --noEmit` — zero errors
2. `pnpm exec next build` — clean build
3. `node ".opencode/skills/impeccable/scripts/detect.mjs"` — empty output
