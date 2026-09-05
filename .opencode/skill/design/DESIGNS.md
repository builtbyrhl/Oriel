# Oriel Design System — Design Variants

## Design v1: "Oriel Noir"

Branch: `oriel/design-browse-v2`

### Concept
Dark cinematic cinema discovery. Think a private screening room meets an editorial film magazine. Every element references the language of film: camera HUDs, film-frame corner markers, reel-inspired roulette carousel, monospace technical readouts.

### Key Visual Motifs
- Custom lerp cursor (dot + ring, gold on hover)
- Lenis smooth inertia scroll
- Camera HUD chrome on hero (REC · 24fps · TAKE 01 · live clock)
- Film-frame corner tension (gold corners pull away on card hover)
- 3D roulette wheel carousel with spring physics
- Gold progress bar line on cards
- Ambient dual glow (gold + purple radial)
- Scanline texture on hero

### Components Built
- CustomCursor — lerp ring + dot, mix-blend-difference, gold hover
- SmoothScrollProvider — Lenis integration
- CornerTensionBox — reusable film-frame corner effect
- ShimmerCard — skeleton loading state
- AmbientBackdrop — radial gradient + dot grid + glows
- BrowseHero — camera HUD, word-by-word title reveal, staggered entrance
- MovieCard — gold corner frames, zoom + dim on hover, gold progress line
- MovieRow — indexed sections, edge fades, "View all" CTA
- SpinToExplore — 3D roulette wheel, auto-rotate, Editor's Picks curation
- ContinueWatchingRow — landscape cards, gold progress, "In progress" badge
- BrowseClient — ambient backdrop, shimmer skeletons, staggered section reveal

### Typography
- Monospace (Geist Mono) for all technical/metadata elements
- Wide letter-spacing on display headings
- Gold (#d4af37) reserved for: brand mark, rating stars, focused card frames, progress bars, badges

### Color Palette
- Background: #050505 (near-black)
- Elevated: #08090d
- Text primary: #ffffff
- Text secondary: rgba(255,255,255,0.65)
- Text muted: rgba(255,255,255,0.45)
- Accent gold: #d4af37
- Border: rgba(255,255,255,0.10)

---

## Design v2: [TBD — next variant to build]
