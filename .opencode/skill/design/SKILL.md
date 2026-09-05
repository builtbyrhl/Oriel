---
name: design
description: Design guidance for Oriel UI. Use when creating or editing components, styling pages, choosing colors, typography, animations, or any visual work. Trigger words: design, style, look, UI, component, page, layout, color, font, animation, dark theme, cinematic.
---

# Oriel Design System

## Brand Identity

Oriel is a **cinema discovery and playback platform** with a dark, premium, cinematic feel. Think the aesthetic of a high-end streaming service (Criterion Channel meets letterboxd dark mode). The brand voice is minimal and editorial — no marketing fluff, just cinema.

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#08090d` | Page background |
| `--bg-elevated` | `#050505` | Cards, sections |
| `--bg-glass` | `rgba(255,255,255,0.04)` | Glassmorphism surfaces |
| `--text-primary` | `#ffffff` | Headings, primary text |
| `--text-secondary` | `rgba(255,255,255,0.65)` | Body, descriptions |
| `--text-muted` | `rgba(255,255,255,0.45)` | Labels, metadata |
| `--text-faint` | `rgba(255,255,255,0.25)` | Dividers, placeholders |
| `--accent-gold` | `#d4af37` | Gold accents, ORIEL branding |
| `--accent-gold-muted` | `rgba(212,175,55,0.15)` | Gold backgrounds, glows |
| `--border` | `rgba(255,255,255,0.1)` | Subtle borders |
| `--border-hover` | `rgba(255,255,255,0.2)` | Hover state borders |

### Typography

- **Display**: `text-6xl font-extralight tracking-[0.45em]` — used for the ORIEL wordmark only
- **Heading**: `text-2xl font-light` — section titles
- **Subheading**: `text-base font-medium` — card titles
- **Body**: `text-sm font-light text-white/65` — descriptions, metadata
- **Caption**: `text-xs text-white/45` — timestamps, labels
- **Label**: `text-[11px] uppercase tracking-[0.35em]` — UI chrome labels

Font stack: `system-ui, sans-serif` (Tailwind default). No custom fonts needed.

### Spacing

- Page padding: `px-6` (24px)
- Section gap: `space-y-14` (56px between rows)
- Card padding: `p-3` to `p-6` depending on component
- Border radius:
  - Cards: `rounded-[24px]` (prominent, cinematic)
  - Buttons: `rounded-full` (pill shape for CTAs)
  - Small UI: `rounded-xl` or `rounded-md`

### Shadows / Glows

- **Ambient glow**: `bg-white/[0.03] blur-[180px]` — creates depth behind hero text
- **Gold glow**: `shadow-[0_0_12px_rgba(255,255,255,0.6)]` — timeline scrubber thumb
- **Card hover**: `hover:scale-[1.03] transition duration-300` — subtle lift

## Layout Patterns

### Page Structure

```
<main class="min-h-screen bg-[#050505] text-white">
  <Navbar />
  <Hero />           ← full-bleed backdrop, title overlay
  <Catalogue>        ← max-w-7xl mx-auto px-6 py-10
    <MovieRow />     ← space-y-14 between rows
    <MovieRow />
</main>
```

### MovieRow

Horizontal scroll row. Structure:
```tsx
<section class="mb-16">
  <h2 class="text-2xl font-light text-white mb-6">{title}</h2>
  <div class="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
    {movies.map(movie => <MovieCard />)}
  </div>
</section>
```

### MovieCard

```tsx
<div class="min-w-[140px] md:min-w-[190px] snap-start">
  <div class="overflow-hidden rounded-[24px] bg-neutral-900">
    <img class="aspect-[2/3] w-full object-cover transition duration-300 hover:scale-[1.03]" />
    <div class="p-3 md:p-4">
      <h3 class="truncate text-base font-medium">{title}</h3>
      <p class="mt-1 text-xs text-white/60">{year}</p>
    </div>
  </div>
</div>
```

### Hero (BrowseHero)

Full-bleed backdrop image with gradient overlay from bottom. Title + rating + synopsis + CTA buttons. Always use `max-w-7xl mx-auto` for content alignment.

### Glassmorphism Navbar

```tsx
<nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
  {/* content */}
</nav>
```

## Animation / Motion

### Principles

1. **Entrance**: Fade + translate, `duration-[1s]` for page-level, `duration-300` for components
2. **Hover**: `scale-[1.03] translateY(-2px)` — subtle lift
3. **Press**: `scale-[0.98]` — tactile feedback
4. **Auto-hide**: Controls fade out after 3s inactivity with `transition-opacity duration-500`

### Framer Motion Patterns

```tsx
// Page entrance
<motion.div
  initial={{ opacity: 0, y: 18 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 1 }}
>

// Hero text reveal
<motion.h1
  initial={{ opacity: 0, letterSpacing: "0.2em" }}
  animate={{ opacity: 1, letterSpacing: "0.45em" }}
  transition={{ duration: 1.2 }}
>

// Button hover
<motion.button
  whileHover={{ scale: 1.03, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
>
```

## Components

### Buttons

- **Primary CTA** (Enter, Watch): `rounded-full border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-xl hover:bg-white/10 hover:border-white/20`
- **Source switcher**: `rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs`
- **Ghost**: `text-white/75 hover:text-white transition`

### Cards

- Background: `bg-neutral-900` or `bg-white/[0.04]` for glass
- Border: `border border-white/10` (optional)
- Hover: scale + shadow lift
- Always `overflow-hidden rounded-[24px]`

### Loading States

- Spinner: `h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white`
- Skeleton: `bg-white/5 animate-pulse rounded`
- Progress bar: `h-[3px] bg-white/15 rounded-full`

### Player (Overlay)

- Background: `fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm`
- Header: `flex items-center justify-between gap-4 px-4 py-3`
- Controls bar: `absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pb-8 pt-20`

## Design Rules

1. **No blue/purple gradients** — use `bg-white/[0.03]` for subtle depth, not neon
2. **No emoji in UI** — use Lucide React icons exclusively
3. **No rounded-2xl on everything** — reserve `rounded-[24px]` for cards, use `rounded-xl` for smaller components
4. **Gold is for branding only** — ORIEL logo, spinner accent, timeline thumb glow. Not for backgrounds or text.
5. **Text hierarchy matters** — never use `text-white` for everything. Use the opacity scale: `text-white/65` for body, `text-white/45` for metadata, `text-white/25` for dividers
6. **Scrollbar hiding** — always use `scrollbar-hide` Tailwind class for horizontal rows
7. **Mobile first** — test at 375px width. Cards at `min-w-[140px]`, expanded at `md:min-w-[190px]`
8. **No white on pure white** — dark theme only. If something needs to be "white", use `rgba(255,255,255,0.x)`
9. **Video player chrome** — loading overlay should use `bg-gradient-to-b from-[#050814] via-[#04070f] to-black` for a deep cinematic backdrop
10. **Aspect ratios** — movie posters: `aspect-[2/3]`, hero backdrop: `aspect-video` or full-bleed

## Icon Set

Use **Lucide React** exclusively. Import examples:
```tsx
import { Play, ArrowRight, X, ChevronLeft, Search, Star, Clock, Maximize2, Volume2, Settings } from "lucide-react"
```

## Tailwind Classes Reference

### Custom Classes Used in Oriel

| Class | Definition |
|-------|-----------|
| `scrollbar-hide` | Hide scrollbar: `[-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden` |
| `backdrop-blur-xl` | `blur(24px)` |
| `backdrop-blur-sm` | `blur(4px)` |

### Useful Tailwind Patterns

```tsx
// Cinematic background
className="bg-[radial-gradient(circle_at_center,#1b2233_0%,#0f1420_35%,#08090d_80%)]"

// Dot grid texture
className="opacity-[0.025]"
style={{ backgroundImage: "radial-gradient(white 0.6px, transparent 0.6px)", backgroundSize: "28px 28px" }}

// Glass surface
className="border border-white/10 bg-white/[0.04]"

// Gold accent line
className="border-t border-[#d4af37]/20"
```
