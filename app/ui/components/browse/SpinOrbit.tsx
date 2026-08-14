"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import {
  RING_COUNT,
  SPIN_DEG_PER_S,
  SELECT_EASE_MS,
  SNAP_EASE_MS,
  RESUME_INACTIVITY_MS,
  DEFAULT_SPIN_GEOMETRY,
  alignPhase,
  cardLayout,
  nextIndex,
  pickIndex,
  prevIndex,
  easeOutCubic,
  type SpinGeometry,
} from "@/lib/oriel/spin-geometry";
import type { SpinUiCandidate } from "@/lib/oriel/spin-client";

const DRAG_FACTOR = 0.14;
const DRAG_TAP_THRESHOLD = 4;

type Props = {
  candidates: SpinUiCandidate[];
  /** True when the user prefers reduced motion (resolution lives in the parent). */
  reducedMotion: boolean;
  /** Fires only when the active (centre) candidate changes. */
  onPickChange: (index: number) => void;
};

function geometryForWidth(width: number): SpinGeometry {
  if (width < 480) return { rx: 34, ry: 15, cy: 56 };
  return { rx: 40, ry: 20, cy: 54 };
}

/**
 * The Spin mechanism — a shallow cinematic ellipse of posters that turns
 * slowly on its own. The card at the apex is the pick: it sits highest,
 * slightly larger, with a thin white outline and a soft elevation; the rest
 * recede down the curve. It is NOT a 3D wheel — no perspective skew, no neon,
 * no bouncy easing. Posters stay recognizable.
 *
 * The engine's deterministic order is the only input. Rotation only advances a
 * phase angle; cards are never reordered or randomized. All per-frame motion
 * is direct DOM style writes via rAF (no React state per frame, no re-renders
 * during rotation). The pick is the card nearest the apex.
 *
 * Interaction: drag rotates the rail, tapping/clicking flies a poster to the
 * centre, arrow keys step through the ring, and auto-rotation pauses while the
 * user is in control, resuming after a calm pause.
 */
export default function SpinOrbit({
  candidates,
  reducedMotion,
  onPickChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const ring = candidates.slice(0, RING_COUNT);
  const count = ring.length;

  const phaseRef = useRef(0);
  const geometryRef = useRef<SpinGeometry>(DEFAULT_SPIN_GEOMETRY);
  const pickIndexRef = useRef(-1);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const lastXRef = useRef(0);
  const autoPausedRef = useRef(false);
  const lastInteractRef = useRef(0);
  const visibleRef = useRef(true);
  const reducedMotionRef = useRef(reducedMotion);
  const easeActiveRef = useRef(false);
  const easeFromRef = useRef(0);
  const easeToRef = useRef(0);
  const easeStartRef = useRef(0);
  const easeDurationRef = useRef(SELECT_EASE_MS);
  const onPickChangeRef = useRef(onPickChange);

  const [pick, setPick] = useState(0);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    onPickChangeRef.current = onPickChange;
  }, [onPickChange]);

  const applyFrame = () => {
    const cards = cardRefs.current;
    const geometry = geometryRef.current;

    for (let i = 0; i < count; i++) {
      const card = cards[i];
      if (!card) continue;

      const layout = cardLayout(i, count, phaseRef.current, geometry);
      card.style.left = `${layout.x}%`;
      card.style.top = `${layout.y}%`;
      card.style.opacity = layout.opacity.toFixed(3);
      card.style.zIndex = String(layout.zIndex);
      card.style.transform = `translate(-50%,-50%) scale(${layout.scale.toFixed(3)})`;
    }

    const active = pickIndex(phaseRef.current, count);
    if (active !== pickIndexRef.current) {
      pickIndexRef.current = active;
      setPick(active);
    }
  };

  // (Re)start the rotation loop whenever the candidate set changes. A fresh
  // set always starts at phase 0, so the engine's first candidate is the pick.
  useLayoutEffect(() => {
    phaseRef.current = 0;
    pickIndexRef.current = -1;
    applyFrame();

    if (count === 0) return;

    const tick = (now: number) => {
      const dt = Math.min(64, now - lastTRef.current);
      lastTRef.current = now;

      if (
        !reducedMotionRef.current &&
        visibleRef.current &&
        !draggingRef.current
      ) {
        if (easeActiveRef.current) {
          const progress = (now - easeStartRef.current) / easeDurationRef.current;

          if (progress >= 1) {
            phaseRef.current = easeToRef.current;
            easeActiveRef.current = false;
            lastInteractRef.current = now;
            autoPausedRef.current = true;
          } else {
            const arc = easeToRef.current - easeFromRef.current;
            phaseRef.current = easeFromRef.current + arc * easeOutCubic(progress);
          }
        } else if (autoPausedRef.current) {
          if (now - lastInteractRef.current > RESUME_INACTIVITY_MS) {
            autoPausedRef.current = false;
          }
        } else {
          phaseRef.current += SPIN_DEG_PER_S * (dt / 1000);
        }
      }

      applyFrame();
      rafRef.current = requestAnimationFrame(tick);
    };

    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      geometryRef.current = geometryForWidth(width);
      applyFrame();
    });

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  function beginInteraction(now: number) {
    lastInteractRef.current = now;
    autoPausedRef.current = true;
    easeActiveRef.current = false;
  }

  function selectCard(index: number, now: number) {
    if (count === 0 || index < 0 || index >= count) return;
    beginInteraction(now);

    if (reducedMotionRef.current) {
      phaseRef.current = alignPhase(phaseRef.current, count, index);
      applyFrame();
      return;
    }

    easeFromRef.current = phaseRef.current;
    easeToRef.current = alignPhase(phaseRef.current, count, index);
    easeStartRef.current = now;
    easeDurationRef.current = SELECT_EASE_MS;
    easeActiveRef.current = true;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    movedRef.current = false;
    lastXRef.current = e.clientX;
    beginInteraction(e.timeStamp);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;

    const dx = e.clientX - lastXRef.current;
    if (Math.abs(dx) > DRAG_TAP_THRESHOLD) movedRef.current = true;
    phaseRef.current -= dx * DRAG_FACTOR;
    lastXRef.current = e.clientX;
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    lastInteractRef.current = performance.now();
    autoPausedRef.current = true;

    if (!movedRef.current || reducedMotionRef.current || count === 0) return;

    const active = pickIndex(phaseRef.current, count);
    easeFromRef.current = phaseRef.current;
    easeToRef.current = alignPhase(phaseRef.current, count, active);
    easeStartRef.current = performance.now();
    easeDurationRef.current = SNAP_EASE_MS;
    easeActiveRef.current = true;
  }

  function onCardClick(index: number, now: number) {
    if (movedRef.current) return; // was a drag, not a tap
    selectCard(index, now);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (count === 0) return;

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const active = pickIndex(phaseRef.current, count);
      selectCard(
        e.key === "ArrowRight" ? nextIndex(active, count) : prevIndex(active, count),
        e.timeStamp
      );
    }
  }

  const activeTitle = ring[pick]?.title;

  return (
    <div>
      <div
        ref={canvasRef}
        role="group"
        aria-label="Spin to explore — a rotating selection of titles"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-[320px] touch-pan-y select-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-white/30 sm:h-[360px] md:h-[440px]"
      >
        <div className="absolute inset-0">
          {count > 0 &&
            ring.map((candidate, i) => {
              const isActive = pick === i;

              return (
                <button
                  key={`${candidate.mediaType}-${candidate.id}`}
                  type="button"
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  aria-label={`Select ${candidate.title}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => onCardClick(i, performance.now())}
                  className={`absolute w-24 transition-shadow duration-700 sm:w-28 md:w-36 lg:w-40 ${
                    isActive
                      ? "rounded-xl ring-1 ring-white/70 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
                      : "rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                  }`}
                >
                  <img
                    src={candidate.image}
                    alt=""
                    draggable={false}
                    className="aspect-[2/3] w-full rounded-xl object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-3 pt-14">
                    <p className="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-white/90">
                      {candidate.title}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>

        {count === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
              The ring is empty
            </p>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {activeTitle ? `Now in focus: ${activeTitle}` : ""}
        </span>
      </div>
    </div>
  );
}
