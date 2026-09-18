"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

export type SpinMovie = {
  id: number;
  title: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
  rating?: number;
  genres?: string[];
  overview?: string;
};

const CARD_W = 168;
const CARD_H = 240;
const GAP = 36;
const DRAG_FACTOR = 0.5;
const BASE_SPEED = 8; // deg / s
const EASE = [0.23, 1, 0.32, 1] as const;

function normalize180(deg: number) {
  return ((((deg % 360) + 540) % 360) - 180);
}

function frontIndex(angle: number, n: number, step: number) {
  return (((-Math.round(angle / step)) % n) + n) % n;
}

export default function SpinCarousel({ movies }: { movies: SpinMovie[] }) {
  const router = useRouter();
  const N = Math.min(movies.length, 12);
  const STEP = 360 / N;
  const R = Math.round((CARD_W + GAP) / (2 * Math.sin((STEP * Math.PI) / 360)));

  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Array<HTMLDivElement | null>>([]);

  const angleRef = useRef(0);
  const velRef = useRef(0);
  const draggingRef = useRef(false);
  const hoverPausedRef = useRef(false);
  const targetRef = useRef<number | null>(null);
  const autoBaseRef = useRef(BASE_SPEED);

  const downX = useRef(0);
  const startAngleAtDown = useRef(0);
  const movedRef = useRef(0);
  const downTime = useRef(0);
  const downTarget = useRef<number | null>(null);
  const rafRef = useRef(0);

  const applyAngleRef = useRef<(angle: number) => void>(() => {});

  const goTo = useCallback(
    (index: number) => {
      const target = -index * STEP;
      const delta = normalize180(target - angleRef.current);
      targetRef.current = angleRef.current + delta;
    },
    [STEP]
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    autoBaseRef.current = reduced ? 0 : BASE_SPEED;

    const applyAngle = (angle: number) => {
      const ring = ringRef.current;
      if (!ring) return;
      ring.style.transform = `rotateX(-10deg) rotateY(${angle.toFixed(2)}deg)`;

      for (let i = 0; i < N; i++) {
        const el = cardEls.current[i];
        if (!el) continue;
        const world = normalize180(angle + i * STEP);
        const cosW = Math.cos((world * Math.PI) / 180);
        const front = Math.max(cosW, 0);
        const scale = 0.9 + 0.2 * front;
        const blur = (1 - front) * 3.5;

        el.style.transform = `rotateY(${(i * STEP).toFixed(2)}deg) translateZ(${R}px) scale(${scale.toFixed(3)})`;
        el.style.filter = blur > 0.02 ? `blur(${blur.toFixed(1)}px) saturate(${(0.55 + 0.45 * front).toFixed(2)}) brightness(${(0.7 + 0.3 * front).toFixed(2)})` : "none";
        el.style.opacity = (0.15 + 0.85 * front).toFixed(2);
        el.style.zIndex = String(100 + Math.round(cosW * 40));
      }
    };
    applyAngleRef.current = applyAngle;

    applyAngle(angleRef.current);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (targetRef.current !== null && !draggingRef.current) {
        const diff = normalize180(targetRef.current - angleRef.current);
        if (Math.abs(diff) < 0.06) {
          angleRef.current = targetRef.current;
          targetRef.current = null;
        } else {
          angleRef.current += diff * Math.min(1, dt * 6);
          applyAngle(angleRef.current);
        }
      } else if (!draggingRef.current) {
        const base = hoverPausedRef.current ? 0 : autoBaseRef.current;
        velRef.current += (base - velRef.current) * Math.min(1, dt * 1.1);
        angleRef.current += velRef.current * dt;
        applyAngle(angleRef.current);
      }

      const front = frontIndex(angleRef.current, N, STEP);
      if (front !== activeIdxRef.current) {
        activeIdxRef.current = front;
        setActiveIdx(front);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [N, R, STEP]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo((activeIdxRef.current + 1) % N);
      if (e.key === "ArrowLeft") goTo((activeIdxRef.current - 1 + N) % N);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, N]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = 0;
    downX.current = e.clientX;
    startAngleAtDown.current = angleRef.current;
    downTime.current = Date.now();
    velRef.current = 0;
    targetRef.current = null;
    const t = (e.target as Element).closest("[data-spin-card]");
    downTarget.current = t ? Number(t.getAttribute("data-spin-card")) : null;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - downX.current;
    movedRef.current = Math.max(movedRef.current, Math.abs(dx));
    const dtMs = Math.max(Date.now() - downTime.current, 16);
    velRef.current = (dx * DRAG_FACTOR) / (dtMs / 1000);
    angleRef.current = startAngleAtDown.current + dx * DRAG_FACTOR;
    applyAngleRef.current(angleRef.current);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    velRef.current = Math.max(Math.min(velRef.current, 260), -260);

    const wasClick = movedRef.current < 6 && Date.now() - downTime.current < 600;
    if (wasClick && downTarget.current !== null) {
      const i = downTarget.current;
      if (i === activeIdxRef.current) {
        router.push(`/${movies[i].contentType}/${movies[i].id}`);
      } else {
        goTo(i);
      }
    }
  };

  const current = movies[activeIdx];

  return (
    <section className="relative select-none overflow-hidden">
      {/* Vignette for the stage */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 900,
          height: 420,
          background: "radial-gradient(closest-side, rgba(255,255,255,0.05) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* 3D stage */}
      <div
        ref={stageRef}
        className="relative mx-auto w-full select-none"
        style={{
          height: CARD_H * 1.45,
          perspective: 1500,
          perspectiveOrigin: "50% 42%",
          touchAction: "pan-y",
          cursor: "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => { hoverPausedRef.current = true; }}
        onMouseLeave={() => { hoverPausedRef.current = false; }}
      >
        {/* Floor shadow */}
        <div className="pointer-events-none absolute left-1/2 top-[70%] h-16 w-[520px] -translate-x-1/2 rounded-full bg-black/60 blur-[30px]" />

        {/* Centroid wrapper — scaled down on small screens */}
        <div
          className="absolute left-1/2 top-1/2 scale-[0.68] [transform-style:preserve-3d] sm:scale-[0.85] lg:scale-100"
          style={{ width: 0, height: 0 }}
        >
          <div
            ref={ringRef}
            className="relative [transform-style:preserve-3d]"
            style={{ width: 0, height: 0, willChange: "transform" }}
          >
            {movies.slice(0, N).map((movie, i) => (
              <div
                key={`${movie.id}-${i}`}
                data-spin-card={i}
                ref={(el) => { cardEls.current[i] = el; }}
                className="absolute left-0 top-0 [transform-style:preserve-3d]"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: -CARD_W / 2,
                  marginTop: -CARD_H / 2,
                  willChange: "transform, opacity, filter",
                }}
              >
                <div className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black [backface-visibility:hidden]">
                  <img
                    src={movie.image}
                    alt={movie.title}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className="absolute left-3 top-3 font-mono text-[9px] tracking-[0.25em] text-white/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i === activeIdx && (
                    <span className="absolute inset-0 rounded-2xl border border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.12)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Caption + controls */}
      <div className="relative z-10 mx-auto mt-2 flex max-w-xl flex-col items-center text-center">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="mb-2.5 flex items-center justify-center gap-3">
                {typeof current.rating === "number" && current.rating > 0 && (
                  <>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                      <Star className="h-3 w-3 fill-white/70 text-white/70" />
                      {current.rating.toFixed(1)}
                    </span>
                    <span className="h-3 w-px bg-white/15" />
                  </>
                )}
                <span className="font-mono text-[11px] tracking-[0.15em] text-white/45">
                  {current.year}
                </span>
              </div>

              <h3 className="text-2xl font-extralight tracking-wide text-white md:text-3xl">
                {current.title}
              </h3>

              {current.genres && current.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  {current.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-white/12 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={() => router.push(`/${current.contentType}/${current.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Watch
                </button>
                <button
                  onClick={() => goTo((activeIdx + 1) % N)}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-light text-white/60 transition-all duration-300 hover:border-white/30 hover:text-white"
                >
                  Next pick
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arrows */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => goTo((activeIdx - 1 + N) % N)}
            aria-label="Previous"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/55 transition-all duration-300 hover:border-white/35 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {movies.slice(0, N).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Pick ${i + 1}`}
                className="h-[2px] rounded-full transition-all duration-500"
                style={{
                  width: i === activeIdx ? 22 : 5,
                  background: i === activeIdx ? "#ffffff" : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => goTo((activeIdx + 1) % N)}
            aria-label="Next"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/55 transition-all duration-300 hover:border-white/35 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
          Drag to spin · it drifts on its own
        </p>
      </div>
    </section>
  );
}