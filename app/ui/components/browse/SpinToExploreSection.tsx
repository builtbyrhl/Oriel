"use client";

import { useEffect, useState } from "react";
import SpinToExplore from "./SpinToExplore";

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
};

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi", 10766: "Soap", 10767: "Talk", 10768: "War",
};

function mapGenres(ids: number[] | undefined): string[] {
  if (!ids) return ["Drama"];
  return ids
    .map((id) => GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 3);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SpinToExploreSection({
  type,
}: {
  type: "movie" | "tv";
}) {
  const [movies, setMovies] = useState<
    {
      id: number;
      title: string;
      year: string;
      image: string;
      contentType: "movie" | "series";
      rating: number;
      genres: string[];
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const [trending, topRated] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }).then(
            (r) => r.json()
          ),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }).then(
            (r) => r.json()
          ),
        ]);

        if (cancelled) return;

        const mapMovie = (m: ApiMovie) => {
          const title = m.title || m.name || "Untitled";
          const year = (m.release_date || m.first_air_date || "").slice(0, 4);
          const image = `https://image.tmdb.org/t/p/w500${
            m.backdrop_path || m.poster_path || ""
          }`;
          return {
            id: m.id,
            title,
            year,
            image,
            contentType: type === "tv" ? ("series" as const) : ("movie" as const),
            rating: m.vote_average || 0,
            genres: mapGenres(m.genre_ids),
          };
        };

        const trendMovies = ((trending.results || []) as ApiMovie[]).map(
          mapMovie
        );
        const topMovies = ((topRated.results || []) as ApiMovie[]).map(mapMovie);

        // Curate: take a deterministic mix of trending + top-rated
        const seen = new Set<number>();
        const curated: ReturnType<typeof mapMovie>[] = [];

        // Interleave for variety
        const trendShuffled = shuffle(trendMovies).slice(0, 4);
        const topShuffled = shuffle(topMovies).slice(0, 3);

        for (const m of [...trendShuffled, ...topShuffled]) {
          if (seen.has(m.id) || !m.image.endsWith("/")) continue;
          seen.add(m.id);
          curated.push(m);
        }

        if (!cancelled) setMovies(curated.slice(0, 7));
      } catch (err) {
        console.error("SpinToExplore fetch failed", err);
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (loading) {
    return (
      <section className="relative w-full py-20 md:py-28">
        <div className="flex flex-col items-center">
          <div className="mb-12 h-3 w-32 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="mb-6 h-8 w-64 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[300px] w-[200px] animate-pulse rounded-[18px] border border-white/[0.06] bg-white/[0.02]"
                style={{
                  transform: `scale(${1 - i * 0.1})`,
                  opacity: 1 - i * 0.18,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return <SpinToExplore movies={movies} />;
}
