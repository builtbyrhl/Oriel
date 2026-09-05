"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import {
  ContinueMovie,
  getContinueWatching,
} from "@/lib/continueWatching";

export default function ContinueWatchingRow() {
  const [movies, setMovies] = useState<ContinueMovie[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const m = getContinueWatching();
    setMovies(m);
    if (m.length > 0) {
      queueMicrotask(() => setVisible(true));
    }
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={visible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="mb-7 flex items-end justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums tracking-[0.2em] text-[#d4af37]/80">
            00
          </span>
          <div>
            <h3 className="text-xl font-light tracking-tight text-white md:text-2xl">
              Continue Watching
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              Pick up where you left off
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#050505] to-transparent" />

        <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-3 pt-1 snap-x snap-mandatory scrollbar-hide md:gap-4">
          {movies.map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.1 + i * 0.05,
                duration: 0.5,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="group relative min-w-[200px] flex-shrink-0 snap-start md:min-w-[260px]"
            >
              <Link href={`/movie/${movie.id}`} className="block">
                <div className="relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-neutral-900/80 transition-all duration-500 hover:border-[#d4af37]/30 hover:shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.12)]">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={movie.backdrop}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110"
                    />

                    {/* Dim layer */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top badges */}
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className="rounded-full border border-[#d4af37]/40 bg-black/60 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d4af37]/90 backdrop-blur-sm">
                        In progress
                      </span>
                    </div>

                    {/* Rating top right */}
                    {movie.rating > 0 && (
                      <div className="absolute right-3 top-3 font-mono text-[10px] tabular-nums text-white/70">
                        {movie.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 pb-4">
                    <h3 className="truncate text-sm font-medium leading-snug text-white/95">
                      {movie.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] tabular-nums text-white/45">
                        {movie.year}
                      </span>
                      <span className="font-mono text-[10px] text-white/55">
                        {Math.round(movie.progress)}%
                      </span>
                    </div>

                    {/* Progress bar — cinematic gold */}
                    <div className="relative mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#d4af37]/60 to-[#d4af37] transition-all duration-1000"
                        style={{ width: `${movie.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
