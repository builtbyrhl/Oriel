"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type WaveMovie = {
  id: number;
  title: string;
  poster: string;
  year?: string;
  contentType: "movie" | "series";
};

const CARD_W = 206;
const CARD_H = 296;
const AMP = 34;

export default function TrendingWave({ movies }: { movies: WaveMovie[] }) {
  const N = Math.min(movies.length, 16);
  const list = movies.slice(0, N);
  if (list.length === 0) return null;
  const doubled = [...list, ...list];

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="mb-10 flex items-center gap-5"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.35em] text-white/30">
          04
        </span>
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white md:text-[26px]">
            Trending now
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            The full catalogue, in this week&apos;s tide
          </p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      </motion.div>

      <div className="oriel-wave-hover group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#050507] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#050507] to-transparent" />

        <div className="oriel-wave-track flex w-max items-start gap-5 px-12 pt-14 pb-10">
          {doubled.map((movie, idx) => {
            const pos = idx % N;
            const angle = (pos / N) * Math.PI * 2;
            const lift = Math.sin(angle) * AMP;
            const tilt = Math.sin(angle) * 2.4;

            return (
              <Link
                key={`${movie.id}-${idx}`}
                href={`/${movie.contentType}/${movie.id}`}
                className="group/card relative block shrink-0"
                style={{ width: CARD_W, marginTop: lift }}
              >
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_18px_45px_rgba(0,0,0,0.55)] transition-all duration-500 hover:border-white/25 hover:shadow-[0_24px_60px_rgba(0,0,0,0.7)] hover:scale-[1.04]"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    transform: `rotate(${tilt.toFixed(2)}deg)`,
                  }}
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover transition-all duration-700 group-hover/card:brightness-75"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5">
                    <h3 className="truncate text-[12px] font-medium leading-snug text-white/95">
                      {movie.title}
                    </h3>
                    {movie.year && (
                      <p className="mt-1 font-mono text-[8px] tracking-[0.22em] text-white/40">
                        {movie.year}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.35em] text-white/20">
        <span className="block h-1 w-1 rounded-full bg-white/30" />
        Hover to pause the tide
      </div>
    </section>
  );
}