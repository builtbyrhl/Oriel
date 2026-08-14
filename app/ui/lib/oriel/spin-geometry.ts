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
