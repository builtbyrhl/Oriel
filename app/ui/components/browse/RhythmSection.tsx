"use client";

import { useState } from "react";
import SectionHead from "@/components/browse/SectionHead";
import type { Movie } from "@/components/movies/MovieCard";

/**
 * Art-directed floating-poster layout: fixed slots with varied sizes,
 * positions and subtle rotations so the canvas reads like a film-art
 * gallery, not a grid or a row. Positions are percentages of the canvas so
 * the composition survives desktop; on mobile the canvas scrolls wide.
 */
const SLOTS: Array<{
  left: number;
  top: number;
  w: number;
  wMobile: number;
  rotate: number;
  z: number;
}> = [
  { left: 5, top: 20, w: 158, wMobile: 118, rotate: -5, z: 1 },
  { left: 21, top: 8, w: 176, wMobile: 132, rotate: -1, z: 2 },
  { left: 37, top: 26, w: 138, wMobile: 104, rotate: 3, z: 1 },
  { left: 49, top: 5, w: 168, wMobile: 126, rotate: -2, z: 3 },
  { left: 63, top: 22, w: 150, wMobile: 112, rotate: 5, z: 1 },
  { left: 77, top: 9, w: 176, wMobile: 132, rotate: -3, z: 2 },
  { left: 92, top: 24, w: 148, wMobile: 112, rotate: 2, z: 1 },
];

const COLLECTIONS = [
  {
    label: "Award Winning",
    eyebrow: "Editorial · Now",
    copy: "The year's most acclaimed films — celebrated, collected, and floating here.",
  },
  {
    label: "Autumn Special",
    eyebrow: "Editorial · This week",
    copy: "A quiet season for slow burners. Warm light, long cuts, lingering moods.",
  },
  {
    label: "Cult Classics",
    eyebrow: "Editorial · Midnight",
    copy: "Films that outgrew their first audience and found a second one forever.",
  },
];

type Props = {
  movies: Movie[];
};

export default function RhythmSection({ movies }: Props) {
  const [index, setIndex] = useState(0);
  const collection = COLLECTIONS[index];
  const posters = movies.slice(0, SLOTS.length);

  return (
    <section className="pt-[74px]">
      <SectionHead
        eyebrow="03 · In focus"
        title="A page with Rhythm"
        sub="A cinematic stage for floating posters. The label below changes with the collection shown inside."
      />

      {/* Black cinematic canvas */}
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a0a0a]">
        <div className="relative h-[420px] w-full max-md:min-w-[760px] md:h-[520px]">
          {posters.map((movie, i) => {
            const slot = SLOTS[i];
            return (
              <div
                key={movie.id}
                style={{
                  left: `${slot.left}%`,
                  top: `${slot.top}%`,
                  zIndex: slot.z,
                }}
                className="group absolute"
              >
                <div
                  className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.75)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-[1.03]"
                  style={{
                    width: `${slot.wMobile}px`,
                    transform: `rotate(${slot.rotate}deg)`,
                  }}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
                <p className="pointer-events-none mt-3 font-serif text-sm tracking-tight text-white/0 transition-colors duration-500 group-hover:text-white/70">
                  {movie.title}
                </p>
              </div>
            );
          })}
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

      {/* Collection switcher */}
      <div className="mt-8 flex items-center justify-center gap-6">
        {COLLECTIONS.map((c, i) => (
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
