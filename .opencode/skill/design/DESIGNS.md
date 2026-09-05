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

## Design v2: "Oriel Whisper"

Branch: `oriel/design-quiet-luxury`

### Concept
Whisper-quiet cinema. Generous negative space, near-black with warm coffee undertones, gold reduced to a few sacred touches. Text-driven hierarchy. The interface steps out of the way so the films speak. Like leafing through a private art-house screening catalog.

### Key Visual Motifs
- Warm-tinted near-black (#0a0807) — not cold
- Gold (#d4af37) used only on: rating stars, brand mark, focused frame
- No bright lights, no glows, no scanlines, no neon
- Editorial typography: large serif-feel headings, monospace metadata
- Generous letter-spacing (0.05em–0.4em)
- Card stack carousel: 3D flip on click, slow spring physics, no auto-play

### Aesthetic
- Background: #0a0807 (warm near-black) with subtle vignette
- Text primary: #f5f1ea (warm ivory, not pure white)
- Text secondary: rgba(245,241,234,0.6)
- Accent: #d4af37 (gold, used sparingly)
- No glow, no neon, no saturation pops
- Whitespace is the design

### Motion Language
- Slower durations (1s+ for entrance)
- Soft spring physics (lower stiffness)
- No auto-play, no bouncing
- Subtle parallax on hero only

### Components To Build
- CursorRing (muted) — small dot only, no ring, no scale on hover
- BrowseHero — minimal, no HUD chrome, slow text reveal, single quiet CTA
- MovieCard — text-led, no decorative elements, restrained hover
- MovieRow — large numbered index, editorial spacing
- CardStack — THE centerpiece carousel: stacked cards, flip on click
- ContinueWatching — quieter version
- BrowseClient — calm entrance, no shimmer, no aggressive animation
