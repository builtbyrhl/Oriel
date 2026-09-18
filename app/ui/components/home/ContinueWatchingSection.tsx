"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Play } from "lucide-react";
import { ContinueMovie, getContinueWatching } from "@/lib/continueWatching";

const EASE = [0.23, 1, 0.32, 1] as const;

export default function ContinueWatchingSection() {
  const [movies, setMovies] = useState<ContinueMovie[]>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMovies(getContinueWatching());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: EASE }}
        className="mb-10 flex items-center gap-5"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.35em] text-white/30">
          01
        </span>
        <h2 className="text-2xl font-light tracking-wide text-white md:text-[26px]">
          Continue watching
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#050507] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#050507] to-transparent" />

        <div className="-mx-6 flex gap-5 overflow-x-auto px-6 pb-2 pt-1 snap-x snap-mandatory scrollbar-hide md:gap-6">
          {movies.map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.8, ease: EASE }}
              className="group w-[300px] shrink-0 snap-start md:w-[340px]"
            >
              <Link href={`/movie/${movie.id}`} className="block">
                <article className="relative overflow-hidden rounded-[20px] border border-white/[0.09] bg-white/[0.06] shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-500 group-hover:border-white/[0.18] group-hover:bg-white/[0.09]">
                  {/* 16:9 artwork */}
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={movie.backdrop}
                      alt={movie.title}
                      draggable={false}
                      className="h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* badge + visit line */}
                    <div className="absolute left-4 top-4 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-white/65">
                      <span className="block h-1.5 w-1.5 rounded-full bg-white/70" />
                      Resume
                    </div>

                    {/* hover play */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                        <Play className="h-4 w-4 fill-current pl-0.5" />
                      </span>
                    </div>
                  </div>

                  {/* glass footer */}
                  <div className="relative bg-white/[0.03] px-4 py-3.5">
                    {/* tiny progress line — right under the artwork */}
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-white/[0.08]">
                      <div
                        className="h-full bg-white transition-all duration-500"
                        style={{
                          width: `${movie.progress}%`,
                          boxShadow: "0 0 12px rgba(255,255,255,0.5)",
                        }}
                      />
                    </div>

                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="truncate text-[13px] font-light tracking-[0.02em] text-white/90">
                        {movie.title}
                      </h3>
                      <span className="shrink-0 font-mono text-[9px] tabular-nums tracking-[0.15em] text-white/35">
                        {Math.round(movie.progress)}%
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                      <Clock className="h-3 w-3" />
                      Left off here
                    </div>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}