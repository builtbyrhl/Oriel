"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Play, Star } from "lucide-react";

type RowMovie = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  rating: number;
  year: string;
  description: string;
  contentType: "movie" | "series";
};

type Props = {
  items: RowMovie[];
  title?: string;
  index?: string;
};

const COLLAPSED = 72;
const EXPANDED = 320;

export default function HoverExpandList({ items, title, index }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="w-full">
      {title && (
        <div className="mb-10 flex items-baseline gap-6">
          {index && <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">{index}</span>}
          <h3 className="text-2xl font-light tracking-wide text-white">{title}</h3>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          const isActive = hovered === i;
          const isDimmed = hovered !== null && !isActive;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              animate={{
                opacity: isDimmed ? 0.38 : 1,
                height: isActive ? EXPANDED : COLLAPSED,
              }}
              transition={{
                height: { type: "spring", stiffness: 180, damping: 26, mass: 0.9 },
                opacity: { duration: 0.3 },
                delay: i * 0.04,
              }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] cursor-pointer"
            >
              <Link href={`/${item.contentType}/${item.id}`} className="block h-full w-full">
                <div className="flex h-full w-full">
                  {/* Image (revealed on hover) */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 1.06 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.06 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="relative h-full flex-shrink-0"
                        style={{ width: EXPANDED * 1.4 }}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-black/80" />

                        {/* Play overlay */}
                        <div className="absolute left-8 top-1/2 -translate-y-1/2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-black shadow-lg">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Text content */}
                  <div className="flex h-full flex-1 items-center justify-between gap-6 px-6 md:px-8">
                    <div className="flex flex-1 items-baseline gap-6">
                      <span className="font-mono text-xs tabular-nums text-white/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <motion.h4
                          layout
                          className="text-base font-light tracking-wide text-white md:text-lg"
                        >
                          {item.title}
                        </motion.h4>
                        <AnimatePresence>
                          {isActive && (
                            <motion.p
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0, transition: { delay: 0.12, duration: 0.4 } }}
                              exit={{ opacity: 0, x: -8 }}
                              className="mt-1 line-clamp-1 text-xs text-white/50"
                            >
                              {item.description}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-4">
                      <span className="font-mono text-xs text-white/40">{item.year}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white/60 text-white/60" />
                        <span className="font-mono text-xs text-white/60">{item.rating.toFixed(1)}</span>
                      </div>
                      <span className="hidden font-mono text-[10px] uppercase tracking-widest text-white/30 md:inline">
                        {item.contentType === "series" ? "Series" : "Film"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
