"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type Movie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

type Props = {
  movie: Movie;
  type: "movie" | "series";
};

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function WhisperHero({ movie, type }: Props) {
  const href = type === "series" ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0">
        <motion.img
          src={movie.image}
          alt={movie.title}
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: EASE }}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Warm vignette — top + sides */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #0a0807 0%, rgba(10,8,7,0.1) 40%, rgba(10,8,7,0.5) 75%, #0a0807 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #0a0807 0%, transparent 40%, transparent 60%, #0a0807 100%)",
        }}
      />

      {/* Very subtle warm glow — no bright light */}
      <div
        className="absolute bottom-0 left-1/4 h-64 w-96 -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at bottom, rgba(212,175,55,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[90vh] items-end pb-20 md:pb-28">
        <div className="mx-auto w-full max-w-7xl px-8 md:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="max-w-xl"
          >
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6, ease: EASE }}
              className="mb-8 font-mono text-[10px] uppercase tracking-[0.5em] text-[#d4af37]/60"
            >
              {type === "movie" ? "Now Playing" : "Now Streaming"}
            </motion.p>

            {/* Title — large, airy */}
            <h1 className="text-[48px] font-extralight leading-[1.0] tracking-[0.04em] text-[#f5f1ea] md:text-[72px] lg:text-[88px]">
              {movie.title}
            </h1>

            {/* Divider line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 1.0, ease: EASE }}
              className="mt-8 h-px origin-left bg-gradient-to-r from-[#d4af37]/40 to-transparent"
              style={{ width: 160 }}
            />

            {/* Meta */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.2, ease: EASE }}
              className="mt-8 flex items-center gap-5 font-mono text-[12px] tracking-[0.15em] text-[#f5f1ea]/45"
            >
              <span>{movie.year}</span>
              <span className="h-3 w-px bg-[#f5f1ea]/15" />
              <span>{type === "movie" ? "Film" : "Series"}</span>
              <span className="h-3 w-px bg-[#f5f1ea]/15" />
              <span className="flex items-center gap-1.5">
                <span className="block h-1 w-1 rounded-full bg-[#d4af37]/70" />
                Featured
              </span>
            </motion.div>

            {/* CTA — single, quiet */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.4, ease: EASE }}
              className="mt-12"
            >
              <Link
                href={href}
                className="group inline-flex items-center gap-3 rounded-full border border-[#f5f1ea]/20 bg-[#f5f1ea]/6 px-8 py-3.5 text-[13px] font-light tracking-[0.12em] text-[#f5f1ea]/80 backdrop-blur-sm transition-all duration-500 hover:border-[#d4af37]/40 hover:bg-[#f5f1ea]/10 hover:text-[#d4af37]/90"
              >
                <span>Explore</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0807]" />
    </section>
  );
}
