---
name: premium-design
description: Premium design patterns for Oriel's cinema UI. Use when designing new pages, components, animations, or upgrading existing UI. Trigger words: design, premium, animation, hover, cursor, smooth, cinematic, glass, card, panel.
---

# Oriel Premium Design — Inspired by Top-Tier Portfolio Sites

This skill captures premium design patterns from high-end creative portfolios
(pacomepertant.com, podium-studios.com, vshslv.com) adapted for Oriel's
cinema/movie discovery platform.

## Design Philosophy

Oriel's UI should feel like stepping into a private cinema:
- **Deliberate, not busy** — every animation serves a purpose
- **Smooth, not flashy** — transitions use spring/elastic easing
- **Dark, not flat** — glassmorphism + depth + ambient light effects
- **Cinematic** — camera/timeline motifs, monospace for technical details, corner-tension hover effects

---

## 1. Custom Cursor

### Smooth Lerp Cursor

```tsx
// components/ui/CustomCursor.tsx
"use client";
import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const isHover = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dot.current) {
        dot.current.style.left = `${e.clientX}px`;
        dot.current.style.top  = `${e.clientY}px`;
      }
    };
    const animate = () => {
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.15;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.15;
      if (ring.current) {
        ring.current.style.left = `${ringPos.current.x}px`;
        ring.current.style.top  = `${ringPos.current.y}px`;
      }
      requestAnimationFrame(animate);
    };
    window.addEventListener("mousemove", onMove);
    const id = requestAnimationFrame(animate);

    // Hover detection for interactive elements
    const hoverTargets = document.querySelectorAll("a, button, [data-cursor-hover]");
    const onEnter = () => {
      isHover.current = true;
      dot.current?.classList.add("scale-150");
      ring.current?.classList.add("mix-difference");
    };
    const onLeave = () => {
      isHover.current = false;
      dot.current?.classList.remove("scale-150");
      ring.current?.classList.remove("mix-difference");
    };
    hoverTargets.forEach(el => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(id);
      hoverTargets.forEach(el => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className="fixed w-2 h-2 rounded-full bg-white pointer-events-none z-[200]
               -translate-x-1/2 -translate-y-1/2 transition-transform duration-100"
      />
      <div
        ref={ring}
        className="fixed w-10 h-10 rounded-full border border-white/40
               pointer-events-none z-[199] -translate-x-1/2 -translate-y-1/2
               transition-all duration-300 mix-blend-difference"
      />
    </>
  );
}
```

CSS for cursor:
```css
/* Global cursor reset where custom cursor is active */
.cursor-active * { cursor: none !important; }
.scale-150 { transform: translate(-50%, -50%) scale(1.5); }
.mix-difference { mix-blend-mode: difference; }
```

**When to use**: Add `cursor-active` class to `<body>` on mount. Hide native cursor only on desktop (pointer: fine).

---

## 2. Smooth Scroll — Lenis

```tsx
// components/ui/SmoothScrollProvider.tsx
"use client";
import { useEffect } from "react";

export default function SmoothScrollProvider() {
  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import("lenis").then(({ default: Lenis }) => {
      const lenis = new Lenis({ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time: number) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    });
    return () => {};
  }, []);
  return null;
}
```

Install: `npm install lenis gsap`
CDN: `https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.27/bundled/lenis.min.js`

---

## 3. Glassmorphism Panels

### Cinematic Glass

```tsx
// Backdrop blur + color-mix for modern glass
<div className="relative rounded-[24px] overflow-hidden">
  {/* Glass layer */}
  <div
    className="absolute inset-0 rounded-inherit pointer-events-none z-[-1]"
    style={{
      background: "color-mix(in srgb, #050505 30%, transparent)",
      backdropFilter: "blur(28px) saturate(160%) brightness(0.85)",
      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(255,255,255,0.10)",
    }}
  />
  {/* Content */}
  <div className="relative z-10 p-6">{/* content */}</div>
</div>
```

### Deep Cinematic Backdrop (for overlays)

```css
/* Player loading overlay */
background: linear-gradient(
  to bottom,
  #050814 0%,
  #04070f 50%,
  #000000 100%
);
```

### Frosted Glass with Gold Border

```tsx
<div
  className="border border-[#d4af37]/20 rounded-[24px] bg-white/[0.03]"
  style={{
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
  }}
>
```

---

## 4. Hover Animations

### Corner Tension Effect (Film Frame / Camera Aesthetic)

This is the signature hover effect from podium-studios — the corners of a box
"pull away" on hover, like tension in a film frame.

```tsx
// components/ui/CornerTensionBox.tsx
"use client";

interface Props {
  children: React.ReactNode;
  className?: string;
  tension?: number; // px offset, default 3
}

export default function CornerTensionBox({ children, className = "", tension = 3 }: Props) {
  return (
    <div className={`relative group ${className}`}>
      {/* Corner lines */}
      <span className="absolute top-0 left-0 w-5 h-px bg-white/30
                  transition-transform duration-300 origin-top-left
                  group-hover:scale-x-0" />
      <span className="absolute top-0 right-0 w-px h-5 bg-white/30
                  transition-transform duration-300 origin-top-right
                  group-hover:scale-y-0" />
      <span className="absolute bottom-0 right-0 w-5 h-px bg-white/30
                  transition-transform duration-300 origin-bottom-right
                  group-hover:scale-x-0" />
      <span className="absolute bottom-0 left-0 w-px h-5 bg-white/30
                  transition-transform duration-300 origin-bottom-left
                  group-hover:scale-y-0" />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

### Underline Reveal

```tsx
// Inline text link with animated underline
<span className="relative inline-block">
  <span className="peer">{children}</span>
  <span
    className="absolute -bottom-0.5 left-0 h-px w-full
               bg-[#d4af37] origin-left scale-x-0
               transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
               group-hover:scale-x-100"
  />
</span>
```

### Card Hover — Cinematic Reveal

```tsx
// Movie card with poster fade + text slide-up
<div className="group overflow-hidden rounded-[24px] bg-neutral-900">
  {/* Image — fades and zooms */}
  <img
    className="aspect-[2/3] w-full object-cover
             transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
             group-hover:scale-105 group-hover:opacity-60"
  />
  {/* Overlay on hover */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-300" />
  {/* Text — slides up from bottom */}
  <div className="absolute bottom-0 left-0 right-0 p-4
             translate-y-3 opacity-0
             group-hover:translate-y-0 group-hover:opacity-100
             transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
    <p className="text-sm font-medium text-white truncate">{title}</p>
    <p className="text-xs text-white/60">{year}</p>
  </div>
  {/* Gold corner — top right */}
  <div className="absolute top-0 right-0 w-6 h-6
             border-t-2 border-r-2 border-[#d4af37]
             opacity-0 group-hover:opacity-100
             transition-opacity duration-300 delay-100" />
</div>
```

### Button — Scale + Gold Border

```tsx
<button
  className="relative px-6 py-3 rounded-full border border-white/15 bg-white/5
             overflow-hidden transition-all duration-200
             hover:border-[#d4af37]/40 hover:bg-white/10
             active:scale-95"
>
  {/* Gold shimmer sweep on hover */}
  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent
              translate-x-[-200%] hover:translate-x-[200%]
              transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
              pointer-events-none" />
  <span className="relative z-10">{children}</span>
</button>
```

---

## 5. Typography

### Monospace for Technical Details

Use monospace for timestamps, counters, episode numbers, ratings — creates a
technical/cinematic feel like a film camera HUD.

```tsx
// Timeline / counter style
<div className="font-mono text-xs tabular-nums tracking-widest text-white/60">
  S{String(season).padStart(2, "0")} · E{String(episode).padStart(2, "0")}
</div>

// Rating badge
<div className="flex items-center gap-1.5">
  <Star className="w-3.5 h-3.5 text-[#d4af37] fill-[#d4af37]" />
  <span className="font-mono text-xs tabular-nums">{rating.toFixed(1)}</span>
</div>
```

### Cinematic Display Heading

```tsx
// Hero title with letter-spacing animation
<h1
  className="text-5xl font-extralight tracking-[0.3em]
         text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]"
>
  {title}
</h1>
```

### Line Height Trim (tight headings)

```css
/* Use lh units for tight control */
h2, h3, h4 { line-height: 1.1; }
p { line-height: 1.6; }
```

---

## 6. Loading & Skeleton States

### Shimmer Skeleton

```tsx
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[24px] bg-neutral-900 animate-pulse">
      {/* Shimmer effect */}
      <div
        className="h-full w-full"
        style={{
          backgroundImage: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
```

### Cinematic Progress Bar

```tsx
// Thin gold line that fills across
<div className="relative h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
  <div
    className="absolute left-0 top-0 h-full bg-[#d4af37] rounded-full"
    style={{ width: `${progress * 100}%` }}
  />
  {/* Glow */}
  <div
    className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
    style={{ left: `${progress * 100}%` }}
  />
</div>
```

---

## 7. Motion & Easing

### Premium Easing Curves

```css
/* Quint out — the "premium" feel: fast start, silky finish */
--ease-quint: cubic-bezier(0.23, 1, 0.32, 1);

/* Spring — for interactive elements */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Expo in-out — for page transitions */
--ease-expo: cubic-bezier(0.87, 0, 0.13, 1);
```

### Staggered Entrance (Page Load)

```tsx
// Framer Motion staggered children
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }}
  transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
>
  {children.map((child, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: 0.6,
        delay: i * 0.08,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {child}
    </motion.div>
  ))}
</motion.div>
```

---

## 8. Layout Patterns

### Ambient Glow Background

```tsx
// Cinematic atmosphere behind hero/player sections
<div className="relative">
  {/* Radial glow */}
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: "radial-gradient(ellipse 80% 60% at 50% 0%, #1b2233 0%, #0f1420 40%, transparent 70%)",
    }}
  />
  {/* Dot grid texture */}
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.025]"
    style={{
      backgroundImage: "radial-gradient(white 0.6px, transparent 0.6px)",
      backgroundSize: "28px 28px",
    }}
  />
</div>
```

### Grid with Fade Edges

```tsx
// Horizontal scroll rows with edge fade
<div className="relative">
  {/* Fade left */}
  <div className="absolute left-0 top-0 bottom-0 w-12 z-10
               bg-gradient-to-r from-[#050505] to-transparent pointer-events-none" />
  {/* Fade right */}
  <div className="absolute right-0 top-0 bottom-0 w-12 z-10
               bg-gradient-to-l from-[#050505] to-transparent pointer-events-none" />
  {/* Scrollable content */}
  <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
    {children}
  </div>
</div>
```

---

## 9. Player Chrome (Video Overlay)

### Camera HUD Style

```tsx
// Monospace timestamp + source label pill
<div className="absolute top-4 left-4 flex items-center gap-3">
  <span className="font-mono text-xs tabular-nums text-white/60">
    00:42:17
  </span>
  <span className="px-2 py-0.5 rounded-full border border-white/20
               bg-black/60 font-mono text-[10px] text-white/60 uppercase tracking-widest">
    VidSrc.me
  </span>
</div>

// REC indicator (red dot blink)
<div className="absolute top-4 right-4 flex items-center gap-1.5">
  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
  <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
    REC
  </span>
</div>
```

### Cinematic Progress Bar (Player)

```tsx
<div className="absolute bottom-8 left-6 right-6">
  {/* Time */}
  <div className="flex justify-between text-[11px] font-mono tabular-nums text-white/40 mb-3">
    <span>00:32:15</span>
    <span>-01:07:45</span>
  </div>
  {/* Scrub bar */}
  <div className="relative h-[3px] bg-white/15 rounded-full cursor-pointer group">
    <div className="absolute left-0 top-0 h-full bg-white rounded-full w-3/4" />
    {/* Thumb */}
    <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2
                 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]
                 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
</div>
```

---

## 10. Color System

```css
:root {
  /* Backgrounds */
  --bg-void:       #000000;
  --bg-base:       #050505;
  --bg-elevated:   #08090d;
  --bg-glass:       rgba(255, 255, 255, 0.03);

  /* Text */
  --text-primary:  #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.65);
  --text-muted:     rgba(255, 255, 255, 0.45);
  --text-faint:     rgba(255, 255, 255, 0.25);

  /* Accent — Gold */
  --gold:          #d4af37;
  --gold-muted:    rgba(212, 175, 55, 0.15);
  --gold-glow:     rgba(212, 175, 55, 0.30);

  /* Borders */
  --border:        rgba(255, 255, 255, 0.10);
  --border-hover:   rgba(255, 255, 255, 0.20);

  /* Easing */
  --ease-quint:  cubic-bezier(0.23, 1, 0.32, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-expo:    cubic-bezier(0.87, 0, 0.13, 1);
}
```

---

## 11. Animation Cheat Sheet

| Effect | CSS | Duration |
|--------|-----|----------|
| Hover scale | `scale(1.03)` | 200ms |
| Press scale | `scale(0.97)` | 100ms |
| Page fade | `opacity 0→1, y: 20→0` | 800ms |
| Card hover | `scale(1.05), opacity(0.6)` | 500ms |
| Underline | `scaleX(0→1)` | 300ms |
| Corner reveal | `scaleX(0→1)` | 300ms |
| Glass blur | `backdrop-filter blur(0→24px)` | 400ms |
| Shimmer | `background-position 200%→-200%` | 1400ms |
| Cursor lerp | `x += (target-x) * 0.15` | RAF loop |

---

## 12. Accessibility

Always include reduced motion support:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
