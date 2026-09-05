"use client";

import { useEffect, useState } from "react";
import OrbitalWheel from "./OrbitalWheel";

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

export default function OrbitalWheelSection({ type }: { type: "movie" | "tv" }) {
  const [movies, setMovies] = useState<{
    id: number; title: string; year: string; image: string;
    contentType: "movie" | "series"; rating: number; genres: string[]; overview?: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trendRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }).then(r => r.json()),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }).then(r => r.json()),
        ]);
        if (cancelled) return;

        const map = (m: ApiMovie) => ({
          id: m.id,
          title: m.title || m.name || "Untitled",
          year: (m.release_date || m.first_air_date || "").slice(0, 4),
          image: `https://image.tmdb.org/t/p/w780${m.backdrop_path || m.poster_path || ""}`,
          contentType: type === "tv" ? ("series" as const) : ("movie" as const),
          rating: m.vote_average || 0,
          genres: mapGenres(m.genre_ids),
          overview: m.overview,
        });

        const trend = ((trendRes.results || []) as ApiMovie[]).map(map);
        const top = ((topRes.results || []) as ApiMovie[]).map(map);
        const seen = new Set<number>();
        const curated = shuffle([...trend.slice(0, 5), ...top.slice(0, 5)])
          .filter(m => {
            if (seen.has(m.id) || !m.image.includes("/")) return false;
            seen.add(m.id);
            return true;
          });

        if (!cancelled) setMovies(curated.slice(0, 8));
      } catch {
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [type]);

  if (loading) {
    return (
      <section className="relative flex w-full flex-col items-center justify-center overflow-hidden" style={{ height: "85vh" }}>
        <div className="mb-8 h-4 w-40 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="relative" style={{ width: 480, height: 480 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 animate-pulse rounded-2xl bg-white/[0.03]"
              style={{
                width: 200 - i * 20,
                height: 260 - i * 26,
                transform: `translate(-50%, ${i * 20}px) rotate(${(i - 1) * 8}deg)`,
                opacity: 1 - i * 0.25,
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;
  return <OrbitalWheel movies={movies} />;
}
