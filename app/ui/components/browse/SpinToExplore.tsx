"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { Play, Plus, ChevronLeft, ChevronRight } from "lucide-react";

type CarouselMovie = {
  id: number;
  title: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
  rating: number;
  genres: string[];
};

type Props = {
  movies: CarouselMovie[];
};

const ITEM_COUNT = 7;
const ITEM_WIDTH = 200;
const ITEM_GAP = 16;
const ITEM_FULL = ITEM_WIDTH + ITEM_GAP;
const VISIBLE_COUNT = 5;
const RADIUS = ITEM_FULL * VISIBLE_COUNT * 0.55;

const SPRING_CONFIG = { stiffness: 180, damping: 28, mass: 1.1 };

export default function SpinToExplore({ movies }: Props) {
  const items = useMemo(() => {
    const source = movies.slice(0, ITEM_COUNT);
    const result: CarouselMovie[] = [];
    for (let i = 0; i < ITEM_COUNT; i++) {
      result.push(source[i % source.length]);
    }
    return result;
  }, [movies]);

  const [activeIndex, setActiveIndex] = useState(Math.floor(ITEM_COUNT / 2));
  const [isDragging, setIsDragging] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragDelta = useRef(0);
  const lastIndex = useRef(activeIndex);

  const x = useMotionValue(0);
  const springX = useSpring(x, SPRING_CONFIG);

  const totalAngle = useTransform(
    springX,
    [-(items.length - 1) * ITEM_FULL, 0],
    [(items.length - 1) * 36, 0]
  );

  const resetAutoSpin = useCallback(() => {
    setAutoSpin(false);
    clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => setAutoSpin(true), 4000);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!autoSpin || isDragging) return;
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [autoSpin, isDragging, items.length]);

  useEffect(() => {
    const target = -activeIndex * ITEM_FULL;
    x.set(target);
    lastIndex.current = activeIndex;
  }, [activeIndex, x]);

  const handleDragStart = (_: unknown, info: { point: { x: number } }) => {
    setIsDragging(true);
    dragStartX.current = info.point.x;
    dragDelta.current = 0;
    resetAutoSpin();
  };

  const handleDrag = (_: unknown, info: { delta: { x: number } }) => {
    dragDelta.current += info.delta.x;
    x.set(-activeIndex * ITEM_FULL + dragDelta.current);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    const moved = Math.round(dragDelta.current / ITEM_FULL);
    const next = Math.max(0, Math.min(items.length - 1, activeIndex - moved));
    setActiveIndex(next);
    dragDelta.current = 0;
    resetAutoSpin();
  };

  const goTo = (index: number) => {
    setActiveIndex(index);
    resetAutoSpin();
  };

  const active = items[activeIndex];

  return (
    <section className="relative w-full overflow-hidden py-20 md:py-28">
      {/* Section background glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.07) 0%, rgba(100,80,200,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.05) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-16 flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3"
        >
          <span className="block h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
          <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-[#d4af37]/80">
            Spin to explore
          </span>
          <span className="block h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-2xl font-extralight tracking-tight text-white md:text-3xl"
        >
          Editor&apos;s Picks
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/35"
        >
          Curated selections · {new Date().getFullYear()}
        </motion.p>
      </div>

      {/* Wheel */}
      <div
        ref={containerRef}
        className="relative z-10 flex flex-col items-center"
        onMouseEnter={() => resetAutoSpin()}
      >
        {/* Carousel track */}
        <div className="relative w-full overflow-hidden py-8">
          <div
            className="relative flex items-center justify-center"
            style={{ height: 340 }}
          >
            {/* Track — the dragging surface */}
            <motion.div
              drag="x"
              dragConstraints={{ left: -(items.length - 1) * ITEM_FULL, right: 0 }}
              dragElastic={0.08}
              onDragStart={handleDragStart}
              onDrag={handleDragEnd}
              onDragEnd={handleDragEnd}
              style={{ x: springX }}
              className="flex cursor-grab active:cursor-grabbing select-none"
            >
              {items.map((movie, i) => (
                <CarouselItem
                  key={`${movie.id}-${i}`}
                  movie={movie}
                  index={i}
                  activeIndex={activeIndex}
                  itemWidth={ITEM_WIDTH}
                  itemGap={ITEM_GAP}
                  itemCount={items.length}
                  isDragging={isDragging}
                />
              ))}
            </motion.div>
          </div>

          {/* Nav arrows */}
          <button
            onClick={() => goTo(Math.max(0, activeIndex - 1))}
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/60 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(Math.min(items.length - 1, activeIndex + 1))}
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/60 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex items-center gap-1.5">
          {items.map((_, i) => {
            const dist = Math.abs(i - activeIndex);
            const opacity = dist === 0 ? 1 : Math.max(0.15, 1 - dist * 0.18);
            const scale = dist === 0 ? 1.4 : Math.max(0.7, 1 - dist * 0.1);
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: dist === 0 ? 20 : 6,
                  height: 6,
                  background:
                    dist === 0
                      ? "#d4af37"
                      : `rgba(255,255,255,${opacity * 0.35})`,
                  transform: `scale(${scale})`,
                  boxShadow:
                    dist === 0
                      ? "0 0 8px rgba(212,175,55,0.6)"
                      : "none",
                }}
              />
            );
          })}
        </div>

        {/* Focused card detail panel */}
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="mt-10 flex flex-col items-center gap-5 text-center"
          >
            {/* Genre tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {active.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="max-w-sm text-xl font-light leading-tight text-white md:text-2xl">
              {active.title}
            </h3>

            {/* Meta */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                <span className="font-mono text-xs tabular-nums text-white/70">
                  {active.rating.toFixed(1)}
                </span>
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span className="font-mono text-xs text-white/50">
                {active.year}
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                {active.contentType === "series" ? "Series" : "Film"}
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-2 flex items-center gap-3">
              <Link
                href={`/${active.contentType}/${active.id}`}
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white px-7 py-3 text-sm font-medium text-black transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-full"
                />
                <Play className="relative h-3.5 w-3.5 fill-current" />
                <span className="relative">Watch now</span>
              </Link>
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur-md transition-all duration-300 hover:border-white/35 hover:bg-white/10 active:scale-95">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

type CarouselItemProps = {
  movie: CarouselMovie;
  index: number;
  activeIndex: number;
  itemWidth: number;
  itemGap: number;
  itemCount: number;
  isDragging: boolean;
};

function CarouselItem({
  movie,
  index,
  activeIndex,
  itemWidth,
  itemGap,
  itemCount,
  isDragging,
}: CarouselItemProps) {
  const offset = index - activeIndex;
  const absOffset = Math.abs(offset);

  const isCenter = offset === 0;
  const isNear = absOffset <= 2;
  const isFar = absOffset > 2;

  const maxWidth = 200;
  const maxHeight = 300;

  const scale = isCenter ? 1.08 : isNear ? 0.82 - absOffset * 0.12 : 0.58 - (absOffset - 3) * 0.1;
  const yOffset = isCenter ? -20 : isNear ? 30 + absOffset * 25 : 80 + (absOffset - 3) * 30;
  const zIndex = isCenter ? 20 : isNear ? 10 - absOffset : 5 - absOffset;
  const opacity = isCenter ? 1 : isNear ? 0.75 - absOffset * 0.2 : 0.3 - (absOffset - 3) * 0.08;
  const rotateY = offset * 28;

  const href = `/${movie.contentType}/${movie.id}`;

  if (isFar) {
    return (
      <div
        style={{
          width: itemWidth,
          flexShrink: 0,
          marginRight: itemGap,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <motion.div
      draggable={false}
      style={{
        width: itemWidth,
        flexShrink: 0,
        marginRight: itemGap,
        zIndex,
        perspective: 1000,
        perspectiveOrigin: "50% 50%",
      }}
      animate={{
        scale,
        y: yOffset,
        opacity,
        rotateY,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 26,
        mass: 1,
      }}
    >
      <Link href={href} className="block">
        <div
          className="relative overflow-hidden rounded-[18px] border border-transparent transition-all duration-500"
          style={{
            height: maxHeight,
            borderColor: isCenter
              ? "rgba(212,175,55,0.55)"
              : "rgba(255,255,255,0.06)",
            boxShadow: isCenter
              ? "0 0 50px rgba(212,175,55,0.18), 0 20px 60px rgba(0,0,0,0.8)"
              : "0 8px 30px rgba(0,0,0,0.6)",
          }}
        >
          <img
            src={movie.image}
            alt={movie.title}
            className="h-full w-full object-cover"
            draggable={false}
          />

          {/* Gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
            }}
          />

          {/* Center card — gold corner frame */}
          {isCenter && (
            <>
              <span
                aria-hidden
                className="absolute right-0 top-0 h-8 w-8 border-t-2 border-r-2 border-[#d4af37]"
                style={{ borderTopRightRadius: 18 }}
              />
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[#d4af37]"
                style={{ borderBottomLeftRadius: 18 }}
              />
              <span
                aria-hidden
                className="absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d4af37]/90"
              >
                {movie.contentType === "series" ? "SERIES" : "FILM"}
              </span>
            </>
          )}

          {/* Info on near cards */}
          {isNear && !isCenter && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="truncate font-mono text-[10px] text-white/70">
                {movie.title}
              </p>
            </div>
          )}

          {/* Full info on center */}
          {isCenter && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="truncate text-sm font-medium text-white">
                {movie.title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-white/55">
                {movie.year}
              </p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
