"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Star } from "lucide-react";
import type { Movie } from "@/components/movies/MovieCard";

type Props = {
  movie: Movie;
  type: "movie" | "series";
};

const EASE = [0.23, 1, 0.32, 1] as const;

export default function BrowseHero({ movie, type }: Props) {
  const href = type === "series" ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <section className="relative min-h-[78vh] overflow-hidden md:min-h-[88vh]">
      {/* Backdrop image — slow ken burns */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: EASE }}
        className="absolute inset-0"
      >
        <img
          src={movie.image}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Cinematic grading — layered gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/95 via-[#050505]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.65)]" />

      {/* Scanline texture (cinematic film feel) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Camera HUD — top left */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
        className="absolute left-6 top-24 z-10 hidden items-center gap-3 md:flex"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.3em] text-white/45">
          REC · 24fps · 2.39:1
        </span>
        <span className="block h-px w-12 bg-white/15" />
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.3em] text-white/35">
          TAKE 01
        </span>
      </motion.div>

      {/* Camera HUD — top right (timestamp) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
        className="absolute right-6 top-24 z-10 hidden items-center gap-2 md:flex"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.3em] text-white/35">
          ORIEL
        </span>
        <span className="block h-px w-8 bg-white/15" />
        <span className="font-mono text-[10px] tabular-nums text-white/45">
          {new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[78vh] items-end md:min-h-[88vh]">
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 md:pb-24">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
            className="mb-6 flex items-center gap-3"
          >
            <span className="block h-px w-10 bg-gradient-to-r from-[#d4af37] to-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">
              {type === "movie" ? "Now Playing · Featured" : "Now Streaming · Featured Series"}
            </span>
          </motion.div>

          {/* Title — split into words with stagger */}
          <h1 className="max-w-4xl text-5xl font-extralight leading-[0.95] tracking-tight text-white md:text-7xl lg:text-[88px]">
            {movie.title.split(" ").map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: 0.45 + i * 0.08,
                  duration: 0.9,
                  ease: EASE,
                }}
                className="inline-block"
              >
                {word}
                {i < movie.title.split(" ").length - 1 ? "\u00A0" : ""}
              </motion.span>
            ))}
          </h1>

          {/* Meta row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.7, ease: EASE }}
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-light text-white/65"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75">
              <span className="block h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              {type === "movie" ? "Film" : "Series"}
            </span>
            {movie.year && (
              <span className="font-mono text-xs tabular-nums text-white/55">
                {movie.year}
              </span>
            )}
            <span className="h-3 w-px bg-white/15" />
            <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-white/65">
              <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
              8.4
            </span>
            <span className="h-3 w-px bg-white/15" />
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
              2h 14m · 4K · HDR
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.7, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href={href}
              className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-light text-white backdrop-blur-md transition-all duration-300 hover:border-[#d4af37]/40 hover:bg-white/10"
            >
              <Play className="h-4 w-4 fill-white text-white" />
              <span>Watch trailer</span>
            </Link>
            <Link
              href={href}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-white px-7 py-3.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-full"
              />
              <span className="relative">Explore film</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom edge — gradient to content */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#050505]" />
    </section>
  );
}
