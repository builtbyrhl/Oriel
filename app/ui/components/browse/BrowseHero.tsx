"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Movie } from "@/components/movies/MovieCard";

type Props = {
  movie: Movie;
  type: "movie" | "series";
};

export default function BrowseHero({ movie, type }: Props) {
  const href =
    type === "series" ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <section className="relative min-h-[60vh] overflow-hidden md:min-h-[78vh]">
      {/* Backdrop */}
      <motion.img
        src={movie.image}
        alt={movie.title}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Cinematic grading */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/30 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

      {/* Subtle vignette for depth */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.45)]" />

      {/* Content */}
      <div className="relative flex min-h-[60vh] items-end md:min-h-[78vh]">
        <div className="mx-auto w-full max-w-7xl px-6 pb-14 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
            <p className="mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.35em] text-white/60">
              <span className="h-px w-8 bg-white/30" />
              {type === "movie" ? "Featured Movie" : "Featured Series"}
            </p>

            <h1 className="max-w-3xl font-serif text-5xl font-normal leading-[1.02] tracking-tight text-[#f3f0e9] md:text-7xl lg:text-8xl">
              {movie.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-light text-white/60">
              <span className="text-white/90">{movie.genre}</span>

              {movie.year && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{movie.year}</span>
                </>
              )}
            </div>

            <div className="mt-8 md:mt-10">
              <Link
                href={href}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-3 text-sm font-medium text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
              >
                Explore
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
