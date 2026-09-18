"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SpinCarousel, { type SpinMovie } from "./SpinCarousel";

type ApiMovie = {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  overview?: string;
};

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 18: "Drama", 14: "Fantasy", 27: "Horror",
  10749: "Romance", 878: "Sci-Fi", 53: "Thriller", 10752: "War",
  99: "Documentary", 36: "History", 9648: "Mystery",
};

function mapGenres(ids: number[] | undefined): string[] {
  if (!ids) return ["Drama"];
  return ids.map((id) => GENRE_MAP[id] || "Drama").slice(0, 3);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpinCarouselSection({ type }: { type: "movie" | "tv" }) {
  const [movies, setMovies] = useState<SpinMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trendRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancelled) return;

        const map = (m: ApiMovie): SpinMovie => ({
          id: m.id,
          title: m.title || m.name || "Untitled",
          year: (m.release_date || m.first_air_date || "").slice(0, 4),
          image: `https://image.tmdb.org/t/p/w500${m.poster_path || m.backdrop_path || ""}`,
          contentType: type === "tv" ? "series" : "movie",
          rating: m.vote_average || 0,
          genres: mapGenres(m.genre_ids),
          overview: m.overview,
        });

        const trend = ((trendRes.results || []) as ApiMovie[]).map(map);
        const top = ((topRes.results || []) as ApiMovie[]).map(map);
        const seen = new Set<number>();
        const curated = shuffle([...trend.slice(0, 6), ...top.slice(0, 6)])
          .filter((m) => {
            if (seen.has(m.id) || !m.image.includes(".jpg") && !m.image.includes("/")) return false;
            seen.add(m.id);
            return true;
          });

        if (!cancelled) setMovies(curated.slice(0, 10));
      } catch {
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [type]);

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="mb-6 flex items-center gap-5"
      >
        <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.35em] text-white/30">
          02
        </span>
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white md:text-[26px]">
            Spin to explore
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Editor&apos;s picks on a slow-spinning reel
          </p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 420 }}>
          <div className="h-4 w-44 animate-pulse rounded-full bg-white/[0.04]" />
        </div>
      ) : movies.length > 0 ? (
        <SpinCarousel movies={movies} />
      ) : null}
    </section>
  );
}