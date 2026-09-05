"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type WheelMovie = {
  id: number;
  title: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
  rating: number;
  genres: string[];
  overview?: string;
};

type Props = {
  movies: WheelMovie[];
};

const ITEM_W = 240;
const ITEM_H = 320;
const ITEM_GAP = 20;
const WHEEL_SIZE = 1600;
const VISIBLE_COUNT = 5;

export default function OrbitalWheel({ movies }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [hysteresis, setHysteresis] = useState(0);
  const hystRef = useRef(0);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  const total = movies.length;
  const current = movies[activeIdx];

  const buildWheel = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll<HTMLDivElement>("[data-wheel-card]");
    if (!cards.length) return;

    const WHEEL_R = WHEEL_SIZE / (2 * Math.PI);
    const ARC = (2 * Math.PI) / cards.length;
    const visibleArc = Math.PI * 0.6;
    const startAngle = Math.PI / 2 - visibleArc / 2;

    cards.forEach((card, i) => {
      const angle = startAngle + i * ARC;
      const x = WHEEL_R * Math.cos(angle);
      const y = -WHEEL_R * Math.sin(angle);
      const distFromCenter = Math.abs(i - activeIdx);
      const isFront = distFromCenter === 0;
      const isNear = distFromCenter <= 2;

      gsap.set(card, {
        x,
        y,
        scale: isFront ? 1.08 : isNear ? 0.82 - distFromCenter * 0.12 : 0.6,
        opacity: isFront ? 1 : isNear ? 0.75 - distFromCenter * 0.2 : 0.25,
        filter: isFront
          ? "blur(0px) saturate(1)"
          : `blur(${distFromCenter * 3}px) saturate(${1 - distFromCenter * 0.25}) brightness(${1 - distFromCenter * 0.15})`,
        zIndex: isFront ? 20 : isNear ? 10 - distFromCenter : 5 - distFromCenter,
      });
    });
  }, [activeIdx]);

  useEffect(() => {
    buildWheel();
  }, [buildWheel]);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(total - 1, idx));
      const dist = Math.abs(clamped - activeIdx);

      let newHyst = hystRef.current;
      if (clamped !== activeIdx) {
        newHyst = dist > total / 2
          ? clamped > activeIdx
            ? hystRef.current - (total - dist)
            : hystRef.current + (total - dist)
          : clamped > activeIdx
          ? hystRef.current + dist
          : hystRef.current - dist;
        hystRef.current = newHyst;
        setHysteresis(newHyst);
      }

      setActiveIdx(clamped);

      const track = trackRef.current;
      if (!track) return;

      const cards = track.querySelectorAll<HTMLDivElement>("[data-wheel-card]");
      const WHEEL_R = WHEEL_SIZE / (2 * Math.PI);
      const ARC = (2 * Math.PI) / cards.length;
      const visibleArc = Math.PI * 0.6;
      const startAngle = Math.PI / 2 - visibleArc / 2;
      const activeAngle = startAngle + clamped * ARC;
      const targetRotation = -activeAngle;

      if (scrollTweenRef.current) scrollTweenRef.current.kill();

      scrollTweenRef.current = gsap.to(track, {
        rotation: targetRotation * (180 / Math.PI),
        duration: 0.9,
        ease: "power3.inOut",
        onUpdate: buildWheel,
      });
    },
    [activeIdx, total, buildWheel]
  );

  const goNext = useCallback(() => goTo((activeIdx + 1) % total), [activeIdx, total, goTo]);
  const goPrev = useCallback(() => goTo((activeIdx - 1 + total) % total), [activeIdx, total, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: "85vh", minHeight: 600 }}
    >
      {/* Section header */}
      <div className="absolute left-1/2 top-10 z-20 -translate-x-1/2 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">
          Scroll to explore
        </p>
        <h2 className="mt-2 text-2xl font-light tracking-wide text-white md:text-3xl">
          Editor&apos;s Picks
        </h2>
      </div>

      {/* Nav arrows */}
      <button
        onClick={goPrev}
        className="absolute left-8 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/60 backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:text-white active:scale-95"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-8 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/60 backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:text-white active:scale-95"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Wheel container — clips the bottom half */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: WHEEL_SIZE * 0.7 }}
      >
        <div
          ref={trackRef}
          className="absolute left-1/2 top-0 origin-top"
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            marginLeft: -WHEEL_SIZE / 2,
            marginTop: WHEEL_SIZE * 0.15,
            perspective: 1200,
            perspectiveOrigin: "50% 30%",
          }}
        >
          {movies.map((movie, i) => (
            <div
              key={`${movie.id}-${i}`}
              data-wheel-card
              className="absolute origin-center"
              style={{
                width: ITEM_W,
                height: ITEM_H,
                marginLeft: -ITEM_W / 2,
                marginTop: -ITEM_H / 2,
              }}
            >
              <Link href={`/${movie.contentType}/${movie.id}`}>
                <div
                  className="relative h-full w-full overflow-hidden rounded-2xl cursor-pointer"
                  onClick={(e) => {
                    if (i !== activeIdx) {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {i === activeIdx && (
                    <>
                      <span className="absolute right-0 top-0 h-10 w-10 border-t-2 border-r-2 border-white/50"
                        style={{ borderTopRightRadius: 16 }} />
                      <span className="absolute bottom-0 left-0 h-10 w-10 border-b-2 border-l-2 border-white/50"
                        style={{ borderBottomLeftRadius: 16 }} />
                    </>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Caption area */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-16 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 text-center"
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <Star className="h-3 w-3 fill-white/60 text-white/60" />
              <span className="font-mono text-xs text-white/60">
                {current.rating.toFixed(1)}
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="font-mono text-xs text-white/40">{current.year}</span>
            </div>
            <h3 className="text-lg font-light tracking-wide text-white">
              {current.title}
            </h3>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {current.genres.slice(0, 3).map((g) => (
                <span key={g} className="rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/50">
                  {g}
                </span>
              ))}
            </div>

            {/* Watch CTA */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={`/${current.contentType}/${current.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-all duration-300 hover:bg-white/90"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Watch
              </Link>
              <button
                onClick={() => setCaptionOpen((v) => !v)}
                className="rounded-full border border-white/20 px-4 py-2.5 text-xs text-white/60 transition-all duration-300 hover:border-white/40 hover:text-white/80"
              >
                {captionOpen ? "Less" : "Details"}
              </button>
            </div>

            {captionOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-auto mt-3 max-w-sm overflow-hidden"
              >
                <p className="text-xs leading-relaxed text-white/40">
                  {current.overview || "No description available."}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="h-[2px] rounded-full transition-all duration-500"
            style={{
              width: i === activeIdx ? 20 : 5,
              background: i === activeIdx ? "#ffffff" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
