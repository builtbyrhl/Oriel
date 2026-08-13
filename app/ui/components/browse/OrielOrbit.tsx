"use client";

import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/components/movies/MovieCard";

/**
 * Shortens long titles for the clean poster treatment ("Dune Part 3" → "Dune..")
 * so cards never carry clutter. Short titles pass through untouched.
 */
export function shortTitle(title: string): string {
  const t = title.trim().replace(/\s+/g, " ");
  if (t.length <= 10) return t;

  const words = t.split(" ");
  const lead = ["the", "a", "an"].includes(words[0]?.toLowerCase()) ? 1 : 0;
  let out = words.slice(0, lead + 1).join(" ");
  if (out.length > 10) out = out.slice(0, 10).replace(/\s+$/, "");
  return `${out}..`;
}

const SPIN_DEG_PER_S = 6;
const DRAG_FACTOR = 0.12;
const RX = 44; // ellipse radii, % of canvas
const RY = 36;

type Props = {
  movies: Movie[];
};

/**
 * The Oriel Orbit — a ring of clean posters (image + short title only) that
 * spins slowly on its own. Drag to rotate the rail. The card at the top of the
 * ring is the current pick: it rises slightly, gains a sleek white outline,
 * and drives the details panel below. No poster rotation physics beyond this.
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

  useEffect(() => {
    const count = movies.length;
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
        const y = 50 + RY * Math.sin(rad);

        const proximity = Math.max(0, Math.cos((diffs[i] * Math.PI) / 180));
        const isPick = i === closest;
        const scale = 0.78 + 0.27 * proximity;
        const rise = isPick ? -12 : 0;
        const opacity = 0.55 + 0.45 * proximity;

        card.style.left = `${x}%`;
        card.style.top = `${y}%`;
        card.style.zIndex = isPick ? "30" : "10";
        card.style.opacity = opacity.toFixed(3);
        card.style.transform =
          `translate(-50%,-50%) translateY(${rise}px) rotate(${-total}deg) scale(${scale.toFixed(3)})`;
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

  const count = movies.length;
  const pick = movies[pickIndex] ?? movies[0];

  return (
    <div>
      <div
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-[430px] cursor-grab touch-pan-y select-none overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_50%_48%,#17130f_0%,#0b0b0b_45%,#070707_75%)] active:cursor-grabbing md:h-[560px]"
      >
        <p className="absolute left-6 top-5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/30 md:left-8 md:top-6">
          Drag to rotate · centre = current pick
        </p>

        <div className="absolute inset-0">
          {count > 0 &&
            movies.map((movie, i) => {
              const slotDeg = (i / count) * 360 - 90;
              const rad = (slotDeg * Math.PI) / 180;
              const x0 = 50 + RX * Math.cos(rad);
              const y0 = 50 + RY * Math.sin(rad);

              return (
                <div
                  key={movie.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  style={{ left: `${x0}%`, top: `${y0}%` }}
                  className={`absolute w-[118px] transition-shadow duration-500 md:w-[168px] ${
                    pickIndex === i
                      ? "rounded-2xl border border-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_70px_rgba(255,255,255,0.12)]"
                      : "rounded-2xl border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full rounded-2xl object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-2 pt-8">
                    <p className="font-serif text-sm tracking-tight text-[#f3f0e9] md:text-base">
                      {shortTitle(movie.title)}
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

          <p className="mt-4 text-xs font-light tracking-wide text-white/50">
            {pick.genre}
            {pick.year ? (
              <>
                <span className="mx-2 inline-block h-1 w-1 rounded-full bg-white/30 align-middle" />
                {pick.year}
              </>
            ) : null}
          </p>

          <p className="mx-auto mt-6 max-w-xl text-sm font-light leading-relaxed text-white/40">
            The synopsis will surface here once Spin lands a title in focus.
          </p>
        </div>
      )}
    </div>
  );
}
