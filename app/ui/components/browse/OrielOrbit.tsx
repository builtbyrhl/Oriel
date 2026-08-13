"use client";

import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/components/movies/MovieCard";

const SPIN_DEG_PER_S = 6;
const DRAG_FACTOR = 0.12;
const RX = 46; // shallow horizontal arc — radii, % of canvas
const RY = 16;
const CY = 58; // ellipse centre height, % of canvas
const RING_SIZE = 5; // one primary + two inner + two outer posters

type Props = {
  movies: Movie[];
};

/**
 * The Oriel Orbit — a shallow horizontal arc of clean posters (artwork + a
 * single truncated name) that turns slowly on its own. Drag to rotate the
 * rail; the card passing through the apex is the current pick: it sits at the
 * visual centre, slightly higher and slightly larger, with a subtle white
 * outline and a soft elevation. Surrounding posters recede — smaller, lower,
 * dimmer. No poster tilts, no glow: the restraint is the point.
 */
export default function OrielOrbit({ movies }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const angle = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const pickIndexRef = useRef(0);
  const rafRef = useRef(0);

  const [pickIndex, setPickIndex] = useState(0);

  const ring = movies.slice(0, RING_SIZE);

  useEffect(() => {
    const count = Math.min(movies.length, RING_SIZE);
    if (count === 0) return;

    const applyFrame = () => {
      const cards = cardRefs.current;
      const total = angle.current;

      const diffs: number[] = [];
      let closest = 0;
      let closestDist = Infinity;

      for (let i = 0; i < count; i++) {
        const slotDeg = (i / count) * 360 - 90;
        const totalDeg = slotDeg + total;
        const diff = ((((totalDeg - 270) % 360) + 540) % 360) - 180;
        const absDiff = Math.abs(diff);
        diffs.push(diff);
        if (absDiff < closestDist) {
          closestDist = absDiff;
          closest = i;
        }
      }

      for (let i = 0; i < count; i++) {
        const card = cards[i];
        if (!card) continue;

        const rad = ((diffs[i] + 270) * Math.PI) / 180;
        const x = 50 + RX * Math.cos(rad);
        const y = CY + RY * Math.sin(rad);

        const proximity = Math.max(0, Math.cos((diffs[i] * Math.PI) / 180));
        const isPick = i === closest;
        const scale = isPick ? 1.07 : 0.78 + 0.27 * proximity;
        const rise = isPick ? -16 : 0;
        const opacity = 0.55 + 0.45 * proximity;

        card.style.left = `${x}%`;
        card.style.top = `${y}%`;
        card.style.zIndex = isPick ? "30" : "10";
        card.style.opacity = opacity.toFixed(3);
        card.style.transform =
          `translate(-50%,-50%) translateY(${rise}px) scale(${scale.toFixed(3)})`;
      }

      if (closest !== pickIndexRef.current) {
        pickIndexRef.current = closest;
        setPickIndex(closest);
      }
    };

    const tick = (t: number) => {
      const dt = Math.min(64, t - lastT.current);
      lastT.current = t;
      if (!dragging.current) angle.current += SPIN_DEG_PER_S * (dt / 1000);
      applyFrame();
      rafRef.current = requestAnimationFrame(tick);
    };

    lastT.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [movies]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    lastX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    angle.current += (e.clientX - lastX.current) * DRAG_FACTOR;
    lastX.current = e.clientX;
  }

  function endDrag() {
    dragging.current = false;
  }

  const count = ring.length;
  const pick = ring[pickIndex] ?? ring[0];

  const meta = [
    pick?.year,
    pick?.rating != null ? `${pick.rating.toFixed(1)}` : null,
    pick?.genres?.length ? pick.genres.slice(0, 3).join(" · ") : pick?.genre,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-[430px] cursor-grab touch-pan-y select-none overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_50%_58%,#17130f_0%,#0b0b0b_45%,#070707_75%)] active:cursor-grabbing md:h-[560px]"
      >
        <p className="absolute left-6 top-5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/30 md:left-8 md:top-6">
          Drag to rotate · centre = current pick
        </p>

        <div className="absolute inset-0">
          {count > 0 &&
            ring.map((movie, i) => {
              const slotDeg = (i / count) * 360 - 90;
              const rad = (slotDeg * Math.PI) / 180;
              const x0 = 50 + RX * Math.cos(rad);
              const y0 = CY + RY * Math.sin(rad);

              return (
                <div
                  key={movie.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  style={{ left: `${x0}%`, top: `${y0}%` }}
                  className={`absolute w-[112px] transition-shadow duration-500 md:w-[156px] ${
                    pickIndex === i
                      ? "rounded-xl border border-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_28px_60px_rgba(0,0,0,0.7)]"
                      : "rounded-xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full rounded-xl object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2.5 pb-2 pt-10">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-white/85">
                      {movie.title}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>

        {count === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
              The orbit is empty
            </p>
          </div>
        )}
      </div>

      {pick && (
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]">
            Now in focus · Oriel Pick
            <span className="h-px w-6 bg-[#817767]" />
          </p>

          <h3 className="mt-4 font-serif text-3xl font-normal tracking-tight text-[#f3f0e9] md:text-5xl">
            {pick.title}
          </h3>

          {meta && (
            <p className="mt-4 text-xs font-light uppercase tracking-[0.2em] text-white/50">
              {meta}
            </p>
          )}

          <p className="mx-auto mt-6 max-w-xl text-sm font-light leading-relaxed text-white/40">
            {pick.overview ||
              "The synopsis will surface here once Spin lands a title in focus."}
          </p>
        </div>
      )}
    </div>
  );
}
