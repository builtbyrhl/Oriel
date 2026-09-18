"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Waves } from "lucide-react";

export type RhythmMovie = {
  id: number;
  title: string;
  poster: string;
  year?: string;
  contentType: "movie" | "series";
};

const PW = 128;
const PH = 182;
const MARGIN = 22;

function hashRand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Item = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  phase: number;
};

export default function RhythmField({ movies }: { movies: RhythmMovie[] }) {
  const router = useRouter();

  const boxRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<Array<HTMLDivElement | null>>([]);
  const items = useRef<Item[]>([]);
  const dims = useRef({ w: 0, h: 0 });
  const dragIdx = useRef(-1);
  const pointer = useRef({ x: 0, y: 0 });
  const downPos = useRef({ x: 0, y: 0 });
  const moved = useRef(0);

  const count = Math.min(movies.length, 10);
  const list = movies.slice(0, count);

  // Seed poster positions once the box is measured.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    dims.current = { w: rect.width, h: rect.height };

    items.current = list.map((m) => ({
      x: 24 + hashRand(m.id + 1) * Math.max(dims.current.w - PW - MARGIN * 2 - 48, 0),
      y: 24 + hashRand(m.id + 2) * Math.max(dims.current.h - PH - MARGIN * 2 - 48, 0),
      vx: 0,
      vy: 0,
      rot: (hashRand(m.id + 3) - 0.5) * 9,
      phase: hashRand(m.id + 4) * Math.PI * 2,
    }));
  }, [list]);

  // Keep dimensions correct across resizes.
  useEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const prev = dims.current;
      if (Math.abs(rect.width - prev.w) > 1 || Math.abs(rect.height - prev.h) > 1) {
        dims.current = { w: rect.width, h: rect.height };
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Physics loop — ambient float + repulsion + drag spring.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const { w, h } = dims.current;
      const listArr = items.current;
      const d = dragIdx.current;

      for (let i = 0; i < listArr.length; i++) {
        const it = listArr[i];

        if (d === i) {
          // Spring toward the pointer, slight inertia for a liquid feel.
          const tx = pointer.current.x - PW / 2;
          const ty = pointer.current.y - PH / 2;
          it.vx += (tx - it.x) * 16 * dt;
          it.vy += (ty - it.y) * 16 * dt;
          it.vx *= Math.exp(-9 * dt);
          it.vy *= Math.exp(-9 * dt);
        } else {
          // Hydrophobic push — flee from the grabbed poster.
          if (d >= 0) {
            const g = listArr[d];
            const dx = it.x - g.x;
            const dy = it.y - g.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const R = 290;
            if (dist < R) {
              const f = (1 - dist / R) * 2600;
              it.vx += (dx / dist) * f * dt;
              it.vy += (dy / dist) * f * dt;
            }
          }

          // Soft pairwise separation so posters never stack.
          for (let j = i + 1; j < listArr.length; j++) {
            if (d === j) continue;
            const o = listArr[j];
            const dx = it.x - o.x;
            const dy = it.y - o.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minD = 96;
            if (dist < minD) {
              const f = (1 - dist / minD) * 640;
              const nx = dx / dist;
              const ny = dy / dist;
              it.vx += nx * f * dt;
              it.vy += ny * f * dt;
              o.vx -= nx * f * dt;
              o.vy -= ny * f * dt;
            }
          }

          // Gentle ambient drift.
          if (!reduced) {
            it.vx += Math.sin((now / 1000) * 0.6 + it.phase) * 30 * dt;
            it.vy += Math.cos((now / 1000) * 0.45 + it.phase * 1.7) * 26 * dt;
          }

          it.vx *= Math.exp(-1.8 * dt);
          it.vy *= Math.exp(-1.8 * dt);
        }

        it.x += it.vx * dt;
        it.y += it.vy * dt;

        if (it.x < MARGIN) { it.x = MARGIN; it.vx *= -0.5; }
        if (it.x > w - MARGIN - PW) { it.x = w - MARGIN - PW; it.vx *= -0.5; }
        if (it.y < MARGIN) { it.y = MARGIN; it.vy *= -0.5; }
        if (it.y > h - MARGIN - PH) { it.y = h - MARGIN - PH; it.vy *= -0.5; }

        const el = elRefs.current[i];
        if (el) {
          const grabbed = d === i;
          el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0) rotate(${grabbed ? 0 : it.rot.toFixed(1)}deg) scale(${grabbed ? 1.07 : 1})`;
          el.style.zIndex = grabbed ? "30" : "10";
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPosterDown = (e: React.PointerEvent, i: number) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragIdx.current = i;
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      downPos.current = { x: e.clientX, y: e.clientY };
      pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    moved.current = 0;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onPosterMove = (e: React.PointerEvent) => {
    if (dragIdx.current < 0) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    moved.current = Math.max(
      moved.current,
      Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y)
    );
  };

  const onPosterUp = (e: React.PointerEvent, i: number, movie: RhythmMovie) => {
    if (dragIdx.current !== i) return;
    dragIdx.current = -1;
    if (moved.current < 6) {
      router.push(`/${movie.contentType}/${movie.id}`);
    }
  };

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="mb-10 flex items-center gap-5"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.35em] text-white/30">
          03
        </span>
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white md:text-[26px]">
            The rhythm room
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Grab a poster — the rest ripple away like water
          </p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      </motion.div>

      <div
        ref={boxRef}
        className="relative h-[540px] w-full select-none overflow-hidden rounded-[28px] border border-white/[0.09] bg-black shadow-[0_40px_120px_rgba(0,0,0,0.7)] md:h-[620px]"
      >
        {/* interior grain + hint */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(white 0.7px, transparent 0.7px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="pointer-events-none absolute right-6 top-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
          <Waves className="h-3.5 w-3.5" />
          Drag · click to open
        </div>
        <div className="pointer-events-none absolute left-6 top-6 font-mono text-[9px] tracking-[0.3em] text-white/20">
          RHYTHM
        </div>

        {list.map((movie, i) => (
          <div
            key={movie.id}
            ref={(el) => { elRefs.current[i] = el; }}
            onPointerDown={(e) => onPosterDown(e, i)}
            onPointerMove={onPosterMove}
            onPointerUp={(e) => onPosterUp(e, i, movie)}
            onPointerCancel={() => { if (dragIdx.current === i) dragIdx.current = -1; }}
            className="absolute left-0 top-0 cursor-grab select-none rounded-xl border border-white/10 bg-black shadow-[0_22px_55px_rgba(0,0,0,0.65)]"
            style={{
              width: PW,
              height: PH,
              touchAction: "none",
              willChange: "transform",
              animation: `orielFade 1s ease ${i * 70}ms backwards`,
            }}
            draggable={false}
          >
            <img
              src={movie.poster}
              alt={movie.title}
              draggable={false}
              className="h-full w-full rounded-[11px] object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-[11px] bg-gradient-to-t from-black/85 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
              <p className="truncate text-[11px] font-medium leading-tight text-white/90">
                {movie.title}
              </p>
              {movie.year && (
                <p className="mt-0.5 font-mono text-[8px] tracking-[0.2em] text-white/40">
                  {movie.year}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}