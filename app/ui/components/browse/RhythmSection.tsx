"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionHead from "@/components/browse/SectionHead";
import type { Movie } from "@/components/movies/MovieCard";

/**
 * Art-directed floating-poster canvas. Posters are the content: no rows, no
 * grids, no cards-with-text-underneath. Fixed slots with varied sizes, depth,
 * subtle rotations and slight overlaps read like a film-art gallery; a faint
 * vignette keeps the stage cinematic. Each poster floats gently on its own
 * rhythm (very slow, staggered, never bouncy).
 *
 * The section is props-driven: the editorial collection (title + copy) is
 * data, and the candidates arrive as `movies` — changing either never
 * requires rebuilding the component.
 */

export type RhythmCollection = {
  label: string;
  eyebrow: string;
  copy: string;
};

const DEFAULT_COLLECTIONS: RhythmCollection[] = [
  {
    label: "Award Winning",
    eyebrow: "Editorial · Now",
    copy: "The year's most acclaimed films — celebrated, collected, and floating here.",
  },
  {
    label: "Hidden Gems",
    eyebrow: "Editorial · This week",
    copy: "Quiet discoveries that never found the top of the charts — only the right audience.",
  },
  {
    label: "Cult Classics",
    eyebrow: "Editorial · Midnight",
    copy: "Films that outgrew their first audience and found a second one forever.",
  },
];

const SLOTS: Array<{
  left: number;
  top: number;
  w: number;
  wMobile: number;
  rotate: number;
  z: number;
  opacity: number;
}> = [
  { left: 3, top: 24, w: 150, wMobile: 112, rotate: -4, z: 1, opacity: 0.82 },
  { left: 16, top: 6, w: 176, wMobile: 132, rotate: -1, z: 3, opacity: 1 },
  { left: 30, top: 28, w: 134, wMobile: 100, rotate: 3, z: 2, opacity: 0.9 },
  { left: 43, top: 3, w: 168, wMobile: 126, rotate: -2, z: 4, opacity: 1 },
  { left: 56, top: 26, w: 144, wMobile: 108, rotate: 5, z: 2, opacity: 0.88 },
  { left: 70, top: 8, w: 172, wMobile: 130, rotate: -3, z: 3, opacity: 1 },
  { left: 84, top: 30, w: 140, wMobile: 106, rotate: 2, z: 1, opacity: 0.8 },
];

type Props = {
  movies: Movie[];
  collections?: RhythmCollection[];
};

export default function RhythmSection({ movies, collections }: Props) {
  const list = collections ?? DEFAULT_COLLECTIONS;
  const [index, setIndex] = useState(0);
  const collection = list[index % list.length];
  const posters = movies.slice(0, SLOTS.length);

  return (
    <section className="pt-24 md:pt-32">
      <SectionHead
        eyebrow="02 · Rhythm"
        title="Rhythm"
        sub="A cinematic stage for floating posters — art-directed, never a row. The label below changes with the collection in focus."
      />

      {/* Black cinematic canvas */}
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a0a0a]">
        <div className="relative h-[420px] w-full max-md:min-w-[760px] md:h-[520px]">
          {posters.map((movie, i) => {
            const slot = SLOTS[i];
            return (
              <motion.div
                key={movie.id}
                className="absolute"
                style={{ left: `${slot.left}%`, top: `${slot.top}%`, zIndex: slot.z }}
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 7 + (i % 3) * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6,
                }}
              >
                <div
                  className="overflow-hidden rounded-xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.75)] transition-transform duration-500 hover:-translate-y-2 hover:scale-[1.03]"
                  style={{
                    width: `${slot.wMobile}px`,
                    transform: `rotate(${slot.rotate}deg)`,
                    opacity: slot.opacity,
                  }}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
              </motion.div>
            );
          })}

          {/* Vignette + soft top highlight keep the stage dark and deep */}
          <div className="pointer-events-none absolute inset-0 rounded-[26px] shadow-[inset_0_0_140px_rgba(0,0,0,0.55)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
        </div>
      </div>

      {/* Swappable editorial copy */}
      <div className="mx-auto mt-14 max-w-2xl text-center">
        <p className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]">
          {collection.eyebrow}
          <span className="h-px w-6 bg-[#817767]" />
        </p>
        <h3 className="mt-4 font-serif text-3xl font-normal tracking-tight text-[#f3f0e9] md:text-5xl">
          {collection.label}
        </h3>
        <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white/40">
          {collection.copy}
        </p>
      </div>

      {/* Collection switcher — pure data, so themes can change without a rebuild */}
      <div className="mt-8 flex items-center justify-center gap-6">
        {list.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setIndex(i)}
            className={`text-[10px] font-medium uppercase tracking-[0.3em] transition ${
              i === index ? "text-[#f3f0e9]" : "text-white/30 hover:text-white/60"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
