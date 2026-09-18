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

## Design v2: "Oriel Whisper" (v2 — unlumen-inspired)

Branch: `oriel/design-quiet-luxury`

### Concept
Direct descendants of unlumen UI's design language — `Orbital Image Wheel` (scroll-driven half-circle of cards with blur+dim focus), `Hover Expand` (skipper-ui style row expansion), and `Hover Feature Cards` motion. Motion is heavy, but every effect serves focus. The interface feels like a curated editorial site, not a Netflix clone.

### Updated Visual Motifs
- Dark base (#050507) with deep radial gradient
- Active focus card = bright + saturated; out-of-focus = blurred, dimmed, desaturated
- Spring physics for all state transitions
- Scroll-driven + click-driven carousel (GSAP-powered)
- No decorative borders; depth comes from blur/contrast

### Updated Components
- OrbitalWheel — scroll-driven half-circle of cards, blur/dim/sat falloff, active card caption
- HoverExpandList — skipper-ui style vertical rows that expand to show full image, spring physics
- WhisperHero — minimal, no HUD chrome, slow text reveal, single quiet CTA
- WhisperCard / WhisperRow — minimal cards, edge fades
- WhisperContinueWatching — quieter version
- WhisperBrowseClient — orchestrates all

### Inspiration sources
- **unlumen UI** (ui.unlumen.com) — OrbitalWheel, HoverExpand patterns
- **skipper-ui** (referenced by unlumen) — horizontal accordion pattern, applied vertically
- **unlumen UI** — Hover Feature Cards slide-in panel pattern

---

## Design v3: "Oriel Rhythm"

Branch: `oriel/design-rhythm`

### Concept
A cinematic "tide" of discoveries. Hero + navbar stay identical to v2's home page; everything below is rebuilt as a sequence of physical, playable sections: glassy resume cards, a slow-spinning 3D reel that you can grab and fling, a black "rhythm room" where posters float and ripple away like water, and trending shown as a drifting wave instead of a flat line.

### Visual Motifs
- Hero and navbar unchanged (keeps `#050507` / white, HomeHero + GlassNavbar)
- Glass 16:9 continue-watching cards — `bg-white/[0.06] backdrop-blur-2xl`, clearly visible, with a tiny glowing white progress line
- Big breathing space between sections (`space-y-32`→`space-y-44`)
- 3D cylinder reel: cards on a `rotateX + rotateY` turntable ring, backfaces hidden, front card sharp/bright, side cards blurred + desaturated
- Physical poster playground: ambient float, grab-spring, hydrophobic radial repulsion, soft pairwise separation
- Trending = infinite marquee wave (sinusoidal lift + tilt per slot, `translateX(-50%)` loop, pauses on hover)

### Components Built
- ContinueWatchingSection — 16:9 glass cards, backdrop art, Resume badge, thin bottom progress line, "Left off here" reading
- SpinCarousel — auto-drifting 3D turntable ring; drag to spin (pointer capture + momentum decay back to base speed); hover-pause; click front card → open, click side card → rotates it to front; arrows + dots + keyboard nav; reduced-motion safe
- SpinCarouselSection — fetches trending + top-rated, curates 10 Editor's Picks (poster 2:3 art)
- RhythmField — black box, ~10 floating posters, rAF particle physics (drag spring, pairwise repulsion, hydro repulsion from grabbed poster, ambient drift, edge bounce); grab = scale up, click without drag = open movie, `touch-action:none`
- TrendingWave — seamless marquee of posters on a sine wave (lift + slight rotation), CSS keyframe drift, pauses on hover

### New CSS (globals.css)
- `.scrollbar-hide` utility (guaranteed)
- `@keyframes orielFade` — poster entrance (opacity only, no transform conflict)
- `@keyframes orielWave` + `.oriel-wave-track` — drifting trending marquee, paused on hover and under `prefers-reduced-motion`

---
