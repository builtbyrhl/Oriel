"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

type CarouselMovie = {
  id: number;
  title: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
  rating: number;
  genres: string[];
  overview?: string;
};

const CARD_W = 380;
const CARD_H = 520;
const STACK_GAP = 12;
const VISIBLE = 3;

type Props = { movies: CarouselMovie[] };

export default function CardStack({ movies }: Props) {
  const [index, setIndex] = useState(0);
  const [flipDir, setFlipDir] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = movies.length;
  const current = movies[index];

  const next = useCallback(() => {
    if (flipping || index >= total - 1) return;
    setFlipDir(1);
    setFlipping(true);
    setInfoOpen(false);
    timerRef.current = setTimeout(() => {
      setIndex((i) => i + 1);
      setFlipping(false);
    }, 650);
  }, [flipping, index, total]);

  const prev = useCallback(() => {
    if (flipping || index <= 0) return;
    setFlipDir(-1);
    setFlipping(true);
    setInfoOpen(false);
    timerRef.current = setTimeout(() => {
      setIndex((i) => i - 1);
      setFlipping(false);
    }, 650);
  }, [flipping, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const visibleMovies = Array.from({ length: VISIBLE + 1 }, (_, i) =>
    index + i < total ? movies[index + i] : null
  ).filter(Boolean) as CarouselMovie[];

  const SPRING = { type: "spring" as const, stiffness: 55, damping: 18, mass: 1.3 };

  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden py-20">
      {/* Header */}
      <div className="mb-14 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#d4af37]/45">
          Editor&apos;s Selection
        </p>
        <h2 className="mt-3 text-2xl font-light tracking-[0.06em] text-[#f5f1ea] md:text-3xl">
          Worth the Watch
        </h2>
      </div>

      {/* Stack area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: CARD_H + 60, width: CARD_W + STACK_GAP * (VISIBLE - 1) + 80 }}
      >
        {/* Back cards */}
        {visibleMovies.slice(0, visibleMovies.length - 1).map((movie, revIdx) => {
          const stackIdx = visibleMovies.length - 2 - revIdx;
          const tx = (stackIdx + 1) * STACK_GAP;
          const ty = -(stackIdx + 1) * STACK_GAP * 0.5;
          const sc = 1 - (stackIdx + 1) * 0.055;
          const z = VISIBLE - stackIdx;

          return (
            <motion.div
              key={`${movie.id}-back-${stackIdx}`}
              className="absolute overflow-hidden rounded-[14px]"
              style={{ width: CARD_W, height: CARD_H, zIndex: z }}
              animate={{ x: tx, y: ty, scale: sc, opacity: 0.6 - stackIdx * 0.18 }}
              transition={SPRING}
            >
              <img src={movie.image} alt={movie.title} className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </motion.div>
          );
        })}

        {/* Top card */}
        <AnimatePresence mode="wait" custom={flipDir}>
          {current && (
            <motion.div
              key={`${current.id}-card`}
              custom={flipDir}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                rotateX: flipDir > 0 ? -95 : 95,
                opacity: 0,
                y: flipDir > 0 ? -150 : 150,
                transition: { duration: 0.62, ease: [0.4, 0, 0.2, 1] },
              }}
              className="absolute z-20 cursor-pointer overflow-hidden rounded-[14px]"
              style={{ width: CARD_W, height: CARD_H, background: "#12100e", perspective: 1200 }}
              onClick={() => setInfoOpen((v) => !v)}
              whileHover={{ scale: 1.018, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
            >
              {/* Poster */}
              <img src={current.image} alt={current.title} className="h-full w-full object-cover" draggable={false} />

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0807] via-[#0a0807]/15 to-transparent" />

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
                  <span className="font-mono text-[10px] text-[#d4af37]">{current.rating.toFixed(1)}</span>
                  <span className="h-3 w-px bg-[#f5f1ea]/15" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#f5f1ea]/35">{current.year}</span>
                </div>
                <h3 className="text-base font-light tracking-[0.04em] text-[#f5f1ea] leading-snug">
                  {current.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {current.genres.slice(0, 2).map((g) => (
                    <span key={g} className="rounded-full border border-[#f5f1ea]/12 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#f5f1ea]/40">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tap hint */}
              <span className="absolute right-4 top-4 font-mono text-[8px] uppercase tracking-widest text-[#f5f1ea]/20">
                tap for detail
              </span>

              {/* Info overlay */}
              <AnimatePresence>
                {infoOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col justify-end bg-[#0a0807]/90 backdrop-blur-md p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-light tracking-[0.04em] text-[#f5f1ea]">{current.title}</h3>
                    <p className="mt-2 line-clamp-3 text-[12px] font-light leading-relaxed text-[#f5f1ea]/50">
                      {current.overview || "No description available."}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Link
                        href={`/${current.contentType}/${current.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[#f5f1ea]/18 bg-[#f5f1ea]/7 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-[#f5f1ea]/80 transition-all duration-300 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Watch
                      </Link>
                      <span className="font-mono text-[9px] text-[#f5f1ea]/25">{current.year}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-10 flex items-center gap-8">
        <button
          onClick={prev}
          disabled={index === 0 || flipping}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f5f1ea]/12 text-[#f5f1ea]/35 transition-all duration-300 hover:border-[#f5f1ea]/25 hover:text-[#f5f1ea]/70 disabled:opacity-20"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col items-center gap-2.5">
          <span className="font-mono text-[10px] tabular-nums text-[#f5f1ea]/25">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="flex gap-1">
            {movies.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (flipping) return;
                  const dir = i > index ? 1 : -1;
                  setFlipDir(dir);
                  setFlipping(true);
                  setInfoOpen(false);
                  timerRef.current = setTimeout(() => { setIndex(i); setFlipping(false); }, 650);
                }}
                className="h-[2px] rounded-full transition-all duration-500"
                style={{
                  width: i === index ? 18 : 5,
                  background: i === index ? "#d4af37" : "rgba(245,241,234,0.18)",
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={next}
          disabled={index >= total - 1 || flipping}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f5f1ea]/12 text-[#f5f1ea]/35 transition-all duration-300 hover:border-[#f5f1ea]/25 hover:text-[#f5f1ea]/70 disabled:opacity-20"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.3em] text-[#f5f1ea]/15">
        use arrow keys to navigate
      </p>
    </section>
  );
}
