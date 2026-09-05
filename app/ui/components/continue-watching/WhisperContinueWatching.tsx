"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { ContinueMovie, getContinueWatching } from "@/lib/continueWatching";

export default function WhisperContinueWatching() {
  const [movies, setMovies] = useState<ContinueMovie[]>([]);

  useEffect(() => {
    const m = getContinueWatching();
    setMovies(m);
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10 flex items-baseline gap-6"
      >
        <span className="font-mono text-[10px] tabular-nums tracking-[0.3em] text-[#d4af37]/40">
          00
        </span>
        <h3 className="text-xl font-light tracking-[0.06em] text-[#f5f1ea]/80">
          Continue Watching
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-[#f5f1ea]/[0.06] to-transparent" />
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0807] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0807] to-transparent" />

        <div className="-mx-8 flex gap-4 overflow-x-auto px-8 pb-4 pt-1 snap-x snap-mandatory scrollbar-hide md:gap-5">
          {movies.map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="group min-w-[220px] snap-start md:min-w-[300px]"
            >
              <Link href={`/movie/${movie.id}`} className="block">
                <div className="relative overflow-hidden rounded-[12px] bg-[#12100e]">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={movie.backdrop}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-all duration-700 group-hover:brightness-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f1ea]/90 text-[#0a0807]">
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/40 to-transparent" />
                  </div>

                  <div className="p-4">
                    <h3 className="truncate text-[13px] font-light tracking-[0.03em] text-[#f5f1ea]/90">
                      {movie.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-[#f5f1ea]/10">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-[#f5f1ea]/40 transition-all"
                          style={{ width: `${movie.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-[#f5f1ea]/30">
                        {Math.round(movie.progress)}%
                      </span>
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
