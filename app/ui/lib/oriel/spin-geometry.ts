// Oriel Spin mechanism — pure layout & motion math.
//
// Everything the SpinOrbit does each frame that can be expressed without the
// DOM lives here, so the animation invariants are unit-testable: the pick is
// always the card nearest the apex, transforms are deterministic functions of
// (index, phase, geometry) with no randomness, and selection always eases a
// specific card to the centre. The component never invents recommendation
// logic; it only walks the engine-provided order.

export interface SpinGeometry {
  /** Horizontal radius of the ellipse, % of canvas width. */
  rx: number;
  /** Vertical radius of the ellipse, % of canvas height. */
  ry: number;
  /** Ellipse centre Y, % of canvas height. */
  cy: number;
}

export const DEFAULT_SPIN_GEOMETRY: SpinGeometry = { rx: 40, ry: 20, cy: 54 };

/** How many posters are shown in the ring (the engine set is larger). */
export const RING_COUNT = 7;

/**
 * Pointer movement (px) past which a press is classified as a drag rather than
 * a tap. Deliberately small: below it the orbit stays put and a release
 * selects the card under the finger; at or beyond it the orbit follows the
 * finger. Single source of truth for tap-vs-drag classification.
 */
export const DRAG_TAP_THRESHOLD_PX = 6;

/** Slow, cinematic auto-rotation speed in degrees/second. */
export const SPIN_DEG_PER_S = 5;

/** Duration of the eased fly-to-centre when a poster is selected. */
export const SELECT_EASE_MS = 900;

/** Duration of the small alignment ease after a drag ends. */
export const SNAP_EASE_MS = 350;

/** Inactivity before auto-rotation resumes after the user takes control. */
export const RESUME_INACTIVITY_MS = 6000;

/** Maps any angle to the (-180, 180] range. */
export function normalizeDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/**
 * Signed degrees the card at `index` is from the apex (0 = dead centre).
 * Positive means it has rotated past the apex.
 */
export function slotDiff(index: number, count: number, phase: number): number {
  const slotDeg = (index / count) * 360 - 90;
  return normalizeDeg(slotDeg + phase - 270);
}

/**
 * The index of the card closest to the apex — the active pick. With phase 0
 * and the engine's order, index 0 (the strongest engine result) is the pick.
 */
export function pickIndex(phase: number, count: number): number {
  if (count <= 0) return -1;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    const dist = Math.abs(slotDiff(i, count, phase));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export interface CardLayout {
  /** Horizontal position, % of canvas width (0..100). */
  x: number;
  /** Vertical position, % of canvas height (0..100). */
  y: number;
  scale: number;
  opacity: number;
  zIndex: number;
  /** 0 at the apex, fading to 0 at the sides/bottom. */
  proximity: number;
  /** Signed degrees from the apex (testability). */
  diff: number;
}

/**
 * Deterministic per-frame layout of a card. A pure function of the engine
 * order (index), the rotation phase and the geometry — never random, never
 * reordered. The apex card is highest, largest and brightest; surrounding
 * cards recede down the shallow ellipse.
 */
export function cardLayout(
  index: number,
  count: number,
  phase: number,
  geometry: SpinGeometry = DEFAULT_SPIN_GEOMETRY
): CardLayout {
  const diff = slotDiff(index, count, phase);
  const rad = ((diff + 270) * Math.PI) / 180;
  const x = 50 + geometry.rx * Math.cos(rad);
  const y = geometry.cy + geometry.ry * Math.sin(rad);
  const proximity = Math.max(0, Math.cos((diff * Math.PI) / 180));

  return {
    x,
    y,
    scale: 0.7 + 0.36 * proximity,
    opacity: 0.45 + 0.55 * proximity,
    zIndex: 10 + Math.round(10 * proximity),
    proximity,
    diff,
  };
}

/**
 * Phase value (nearest to the current one) that centres the card at `index`.
 * Used for both fly-to-centre selection and post-drag alignment.
 */
export function alignPhase(
  phase: number,
  count: number,
  index: number
): number {
  const base = (((-(index / count) * 360) % 360) + 360) % 360;
  let target = base;
  while (target - phase > 180) target -= 360;
  while (target - phase < -180) target += 360;
  return target;
}

/** Next index clockwise; wraps. */
export function nextIndex(index: number, count: number): number {
  return (index + 1) % count;
}

/** Previous index counter-clockwise; wraps. */
export function prevIndex(index: number, count: number): number {
  return (index - 1 + count) % count;
}

/** Cubic ease-out progress for the selection fly. */
export function easeOutCubic(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return 1 - Math.pow(1 - p, 3);
}

/**
 * Formats a runtime in minutes as "2h 14m" (or "45m"). Returns null when no
 * usable runtime is available.
 */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Concise metadata line for the active movie: "2024 · 2h 14m · 7.5". Only
 * includes what is actually available — never invents fields.
 */
export function formatSpinMetadata(
  year: string | null | undefined,
  runtime: number | null | undefined,
  rating: number | null | undefined
): string | null {
  const parts = [
    year && year.trim() ? year : null,
    formatRuntime(runtime),
    rating != null && Number.isFinite(rating) ? rating.toFixed(1) : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Whether the mechanism should auto-rotate under the given motion setting. */
export function shouldAutoRotate(prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion;
}

// ---------------------------------------------------------------------------
// Responsive viewport sizing
//
// One deliberate, testable source of truth for how the ring is sized at any
// canvas width. The poster width, canvas height and ellipse geometry all come
// from the same function so the skeleton placeholder, the orbit and the fit
// guarantees can never drift apart.
// ---------------------------------------------------------------------------

export interface SpinResponsive {
  geometry: SpinGeometry;
  /** Poster width in px (posters are 2:3, so height = 1.5 × width). */
  posterWidth: number;
  /** Canvas height in px that comfortably contains the whole ellipse. */
  canvasHeight: number;
}

/**
 * Poster width for a given canvas width. Mirrors the intended visual density:
 * posters step up as the canvas grows instead of one size for every phone.
 */
export function posterWidthForViewport(width: number): number {
  if (width < 640) return 96;
  if (width < 768) return 112;
  if (width < 1024) return 144;
  return 160;
}

/**
 * Canvas height for a given canvas width. Chosen so the apex card clears the
 * top and the lowest card clears the bottom even at full rotation; the bounds
 * test in spin-geometry.test.ts pins this against the real cardLayout output.
 */
export function spinCanvasHeightForViewport(width: number): number {
  if (width < 640) return 320;
  if (width < 768) return 360;
  if (width < 1024) return 440;
  return 480;
}

/**
 * Ellipse geometry for a given canvas width. On narrow phones the ring pulls
 * in (tighter rx/ry) so neighbouring posters stay fully inside the viewport;
 * on desktop it opens out to the same shallow cinematic ellipse as before.
 * rx is also bounded by the horizontal fit requirement so no card can ever
 * leave the canvas at any phase.
 */
export function spinGeometryForViewport(width: number): SpinGeometry {
  if (width <= 0) return { ...DEFAULT_SPIN_GEOMETRY };
  const posterWidth = posterWidthForViewport(width);
  // Half of the widest off-centre card, as a % of the canvas. This is the
  // margin the ring must keep on each side so scaled cards never clip.
  const halfCardPct = ((posterWidth / 2) * 0.95 * 100) / width;
  const rx = Math.min(width < 420 ? 34 : 40, 50 - halfCardPct);
  return { rx, ry: width < 420 ? 15 : 20, cy: 54 };
}

/** Full responsive sizing for a canvas width. */
export function spinLayoutForViewport(width: number): SpinResponsive {
  return {
    geometry: spinGeometryForViewport(width),
    posterWidth: posterWidthForViewport(width),
    canvasHeight: spinCanvasHeightForViewport(width),
  };
}

// ---------------------------------------------------------------------------
// Drag interaction model
//
// Pure pointer-gesture tracking so tap-vs-drag classification, rotation
// sensitivity and snap targets are unit-testable without a DOM. The component
// feeds raw pointer positions in and applies the returned phase deltas.
// ---------------------------------------------------------------------------

export interface SpinPointerGesture {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  /** True once the drag threshold has been crossed (the gesture is a drag). */
  moved: boolean;
}

/** Begins a fresh gesture; a new gesture per pointerdown keeps state clean. */
export function createSpinPointerGesture(x: number, y: number): SpinPointerGesture {
  return { startX: x, startY: y, lastX: x, lastY: y, moved: false };
}

/**
 * Rotation degrees to apply for a pointer move. Returns 0 until the drag
 * threshold is crossed so a tap never nudges the orbit; the first move past
 * the threshold applies the full displacement from the press so the ring
 * connects to the finger without a jump. Rightward movement rotates the ring
 * so the card under the finger follows it (positive phase delta).
 */
export function advanceSpinGesture(
  gesture: SpinPointerGesture,
  x: number,
  y: number,
  degPerPx: number
): number {
  const dx = x - gesture.lastX;
  gesture.lastX = x;
  gesture.lastY = y;

  if (!gesture.moved) {
    const fromStart = Math.hypot(x - gesture.startX, y - gesture.startY);
    if (fromStart < DRAG_TAP_THRESHOLD_PX) return 0;
    gesture.moved = true;
    return (x - gesture.startX) * degPerPx;
  }

  return dx * degPerPx;
}

/**
 * Whether a gesture ended without crossing the drag threshold — i.e. it was a
 * tap. The component uses this to decide between selecting a card and letting
 * the release snap.
 */
export function gestureEndedAsTap(gesture: SpinPointerGesture | null): boolean {
  return gesture ? !gesture.moved : true;
}

/**
 * Degrees of rotation per pixel of drag, so the ring tracks the finger 1:1:
 * the point of the ring under the finger stays under it (radius-dependent).
 * Wider canvases with a bigger rx give finer control; narrow phones stay
 * reachable within a single swipe.
 */
export function dragDegPerPx(width: number, rxPercent: number): number {
  const radiusPx = (rxPercent / 100) * width;
  if (radiusPx <= 0) return 0.14;
  return 360 / (2 * Math.PI * radiusPx);
}

/**
 * The phase that centres the nearest candidate to the apex, reached by the
 * shortest arc. Used by the release-snap: after a drag ends, the orbit settles
 * on the candidate closest to centre without ever stopping between slots.
 */
export function snapTargetPhase(phase: number, count: number): number {
  if (count <= 0) return phase;
  return alignPhase(phase, count, pickIndex(phase, count));
}
