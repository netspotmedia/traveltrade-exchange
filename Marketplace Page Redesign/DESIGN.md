---
name: Emerald & Ether
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#404944'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#707974'
  outline-variant: '#bfc9c3'
  surface-tint: '#2b6954'
  primary: '#003527'
  on-primary: '#ffffff'
  primary-container: '#064e3b'
  on-primary-container: '#80bea6'
  inverse-primary: '#95d3ba'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#2b2f30'
  on-tertiary: '#ffffff'
  tertiary-container: '#424547'
  on-tertiary-container: '#afb2b4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d6'
  primary-fixed-dim: '#95d3ba'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#0b513d'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  interactive:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is centered on a **Premium, Secure, and Global** travel marketplace aesthetic. It utilizes a refined **Modern-Glassmorphic** style that blends high-end editorial sensibilities with cutting-edge interface technology. 

The brand personality is authoritative yet welcoming, evoking the feeling of a private concierge. The emotional response should be one of "effortless luxury"—where the complexity of global trade is masked by a serene, high-contrast, and translucent interface. Visual depth is used strategically to separate transactional layers from inspirational content.

## Colors

This design system utilizes a high-contrast palette to drive luxury associations and clear information hierarchy.

- **Primary (Deep Emerald):** Used for primary actions, brand presence, and deep backgrounds. It signifies security and stability.
- **Secondary (Gold):** Used sparingly as an accent color for highlights, verified statuses, and premium "Gold Tier" features.
- **Surface & Backgrounds:** The system relies on a very light slate (`#F8FAFC`) for base backgrounds to allow emerald elements and glass layers to pop.
- **Glass Layers:** White at 60-80% opacity with a heavy backdrop blur (20px+) is the standard for elevated containers.

## Typography

The typographic strategy pairs **Noto Serif** for editorial impact and **Hanken Grotesk** for functional clarity. 

- **Headlines:** Use Noto Serif to convey a sense of tradition, heritage, and "Old World" travel luxury. Tighten letter spacing on larger displays to maintain a sophisticated edge.
- **UI & Body:** Hanken Grotesk provides a sharp, contemporary contrast. Its high legibility is essential for the "Secure" aspect of the brand, ensuring data-heavy marketplace screens remain readable.
- **Case Usage:** Use `label-caps` for small identifiers (e.g., "FLIGHT NUMBER", "TOTAL ASSETS") to create a structured, professional rhythm.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **Rhythm:** An 8px base unit governs all dimensions.
- **Negative Space:** Emphasize generous margins and white space around primary headers to maintain the "Premium" feel. Content should never feel cramped.
- **Adaptive Strategy:** On mobile, glass cards should expand to the edge of the screen minus the 16px margin, while on desktop, they should be grouped into logical clusters to prevent excessive horizontal eye travel.

## Elevation & Depth

This design system uses **Glassmorphism** as its primary elevation metaphor. 

1. **Base Layer:** Solid `#F8FAFC` or Deep Emerald gradient.
2. **Glass Layer (Level 1):** White background at 70% opacity with a `24px` backdrop blur and a `1px` inner white stroke (top-left oriented) to simulate a glass edge.
3. **Shadows:** Use extremely soft, ambient shadows. Instead of pure black, use a tinted shadow (e.g., Emerald at 10% opacity) with a large blur radius (`30px+`) and zero spread to create a "floating" effect rather than a "stuck on" effect.

## Shapes

The shape language is **Refined and Balanced**. Elements use a `0.5rem` (8px) base radius which provides a modern feel without the playfulness of fully rounded "pill" shapes. 

- **Primary Cards:** Use `rounded-xl` (24px) to create a soft, inviting frame for travel imagery.
- **Form Inputs/Buttons:** Use the base `rounded` (8px) to maintain a sense of structural integrity and professional precision.
- **Micro-elements:** Chips and tags should use a full pill shape to differentiate them from interactive buttons.

## Components

- **Buttons:** 
  - *Primary:* Deep Emerald background, white text, 8px radius. Use a subtle Gold top-border on hover.
  - *Secondary/Ghost:* Glass background with a 1px emerald border.
- **Cards:** Use a semi-transparent white background with a 32px backdrop blur. Ensure a 1px border (`#FFFFFF` at 20% opacity) is present to define the edges against light backgrounds.
- **Input Fields:** Minimalist. Use a bottom-border only or a very light gray filled style that turns Emerald on focus. Label text should use `label-caps`.
- **Chips:** Gold background with Deep Emerald text for "Featured" or "Premium" listings; Slate-grey for standard filters.
- **Micro-interactions:** On hover, cards should subtly lift (shadow deepens) and the backdrop blur should increase by 10% to create a tactile "focusing" sensation.
- **Specialized Components:** Include a "Global Map Widget" that uses a simplified, dark-emerald vector map with Gold pulse points for active trade routes.