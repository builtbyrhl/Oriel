"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import {
  RING_COUNT,
  SPIN_DEG_PER_S,
  SELECT_EASE_MS,
  SNAP_EASE_MS,
  RESUME_INACTIVITY_MS,
  DEFAULT_SPIN_GEOMETRY,
  advanceSpinGesture,
  alignPhase,
  cardLayout,
  createSpinPointerGesture,
  dragDegPerPx,
  gestureEndedAsTap,
  nextIndex,
  pickIndex,
  prevIndex,
  easeOutCubic,
  type SpinGeometry,
  type SpinPointerGesture,
} from "@/lib/oriel/spin-geometry";
import type { SpinUiCandidate } from "@/lib/oriel/spin-client";
import { useSpinViewportLayout } from "./useSpinViewportLayout";

/**
 * How long a pointer-originated tap/drag flag survives. The synthetic click
 * that follows a pointer interaction must be swallowed (a tap already selects
 * on pointer-up, a drag must never select), but a later keyboard-activated
 * click must not be. The flag expires so it can never go stale.
 */
const POINTER_FLAG_EXPIRY_MS = 500;

type Props = {
  candidates: SpinUiCandidate[];
  /** True when the user prefers reduced motion (resolution lives in the parent). */
  reducedMotion: boolean;
  /** Fires only when the active (centre) candidate changes. */
  onPickChange: (index: number) => void;
};

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
 * Interaction: a press that moves past the drag threshold rotates the ring so
 * the card under the finger follows it; releasing settles on the nearest
 * candidate (shortest arc, never stopping between slots). A press without
 * movement is a tap and flies the card under the finger to the centre. Arrow
 * keys step through the ring, and auto-rotation pauses while the user is in
 * control, resuming after a calm pause.
 */
export default function SpinOrbit({
  candidates,
  reducedMotion,
  onPickChange,
}: Props) {
  const ring = candidates.slice(0, RING_COUNT);
  const count = ring.length;

  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const phaseRef = useRef(0);
  const geometryRef = useRef<SpinGeometry>(DEFAULT_SPIN_GEOMETRY);
  const pickIndexRef = useRef(-1);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);

  const draggingRef = useRef(false);
  const gestureRef = useRef<SpinPointerGesture | null>(null);
  const pointerFlagRef = useRef<{ kind: "drag" | "tap"; at: number } | null>(null);
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

  const { ref: canvasRef, layout } = useSpinViewportLayout((next) => {
    geometryRef.current = next.geometry;
  });

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

      const l = cardLayout(i, count, phaseRef.current, geometry);
      card.style.left = `${l.x}%`;
      card.style.top = `${l.y}%`;
      card.style.opacity = l.opacity.toFixed(3);
      card.style.zIndex = String(l.zIndex);
      card.style.transform = `translate(-50%,-50%) scale(${l.scale.toFixed(3)})`;
    }

    // The pick is only recomputed when nothing is moving under user control.
    // During a drag or an ease the candidate is resolved once, at the end, so
    // the information panel never churns on raw pointer movement.
    if (!draggingRef.current && !easeActiveRef.current) {
      const active = pickIndex(phaseRef.current, count);
      if (active !== pickIndexRef.current) {
        pickIndexRef.current = active;
        setPick(active);
      }
    }
  };

  /** Resolves the pick once, when a snap/selection ease has finished. */
  const finalizePick = () => {
    if (count === 0) return;
    const target = pickIndex(phaseRef.current, count);
    if (target !== pickIndexRef.current) {
      pickIndexRef.current = target;
      setPick(target);
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
            finalizePick();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (count === 0) return;

    gestureRef.current = createSpinPointerGesture(e.clientX, e.clientY);
    draggingRef.current = true;
    pointerFlagRef.current = null;
    beginInteraction(e.timeStamp);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || !draggingRef.current) return;

    const width = canvasRef.current?.clientWidth ?? 0;
    const degPerPx = dragDegPerPx(width, geometryRef.current.rx);
    phaseRef.current += advanceSpinGesture(gesture, e.clientX, e.clientY, degPerPx);
  }

  /**
   * Ends a pointer interaction. A real drag settles on the nearest candidate
   * (shortest arc); a tap is left to the pointer-up handler to select. When
   * the browser cancels the gesture (e.g. it took over for vertical scroll)
   * the same snap invariant applies, so the ring never stops between slots.
   */
  function endInteraction(now: number) {
    if (!draggingRef.current) return;

    const gesture = gestureRef.current;
    draggingRef.current = false;
    gestureRef.current = null;
    lastInteractRef.current = now;
    autoPausedRef.current = true;

    if (!gesture || gestureEndedAsTap(gesture) || reducedMotionRef.current || count === 0) {
      return;
    }

    const active = pickIndex(phaseRef.current, count);
    easeFromRef.current = phaseRef.current;
    easeToRef.current = alignPhase(phaseRef.current, count, active);
    easeStartRef.current = now;
    easeDurationRef.current = SNAP_EASE_MS;
    easeActiveRef.current = true;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    endInteraction(e.timeStamp);

    if (gesture && gestureEndedAsTap(gesture)) {
      pointerFlagRef.current = { kind: "tap", at: e.timeStamp };

      const hit = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest?.("[data-spin-index]");
      const index = hit ? Number(hit.getAttribute("data-spin-index")) : -1;

      if (index >= 0 && index < count) {
        selectCard(index, e.timeStamp);
      }
    } else if (gesture) {
      pointerFlagRef.current = { kind: "drag", at: e.timeStamp };
    }
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    endInteraction(e.timeStamp);
  }

  /**
   * Keyboard activation path (Enter/Space on a focused card) and a safety net
   * for browsers that still synthesize a click after a pointer interaction.
   * The pointer handlers already select on tap / rotate on drag, so any click
   * still in flight from that gesture is swallowed. The timestamp comes from
   * the JSX event prop, matching the repo's lint pattern for impure calls.
   */
  function onCardClick(index: number, now: number) {
    const flagged = pointerFlagRef.current;
    if (flagged && now - flagged.at < POINTER_FLAG_EXPIRY_MS) {
      pointerFlagRef.current = null;
      return;
    }
    pointerFlagRef.current = null;
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
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ height: layout.canvasHeight }}
        className="relative w-full touch-pan-y select-none overflow-hidden outline-none cursor-grab active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-white/30"
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
                  data-spin-index={i}
                  aria-label={`Select ${candidate.title}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => onCardClick(i, performance.now())}
                  style={{ width: layout.posterWidth }}
                  className={`absolute rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-shadow duration-700 ${
                    isActive ? "ring-1 ring-white/80 shadow-[0_24px_60px_rgba(0,0,0,0.6)]" : ""
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
