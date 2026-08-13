"use client";

import Link from "next/link";
import { useState } from "react";
import { Play } from "lucide-react";
import SectionHead from "@/components/browse/SectionHead";
import { getContinueWatching, type ContinueMovie } from "@/lib/continueWatching";

/**
 * Continue Watching — a calm 16:9 viewing surface. Familiar and useful, but
 * deliberately quiet: it never dominates the page. Only the first title shows
 * on small screens, keeping the mobile page light.
 */
export default function ContinueWatchingSection() {
  const [movies] = useState<ContinueMovie[]>(() => getContinueWatching());

  if (movies.length === 0) return null;

  return (
    <section className="pt-[74px]">
      <SectionHead
        eyebrow="01 · Pick up where you left off"
        title="Continue Watching"
        sub="A calm 16:9 viewing surface — familiar, useful, and never allowed to dominate the page."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {movies.slice(0, 3).map((movie, i) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            className={i === 0 ? "block" : "hidden md:block"}
          >
            <div
              className="group relative aspect-video overflow-hidden rounded-[18px] border border-white/10 bg-neutral-900"
              style={{
                backgroundImage: `url(${movie.poster})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

              <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-[#f5f1e9] text-black shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition group-hover:bg-white">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
              </span>

              <div className="absolute inset-x-4 bottom-4">
                <p className="truncate font-serif text-lg tracking-tight text-[#f3f0e9]">
                  {movie.title}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                  {movie.year}
                </p>
                <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#e6dccd]"
                    style={{ width: `${Math.min(100, movie.progress)}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
