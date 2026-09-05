"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import MovieRow from "@/components/movies/MovieRow";
import ContinueWatchingRow from "@/components/continue-watching/ContinueWatchingRow";
import type { Movie } from "@/components/movies/MovieCard";

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [featured, setFeatured] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [trendRes, popRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/popular?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }),
        ]);

        if (!trendRes.ok || !popRes.ok || !topRes.ok) {
          throw new Error("One or more TMDB requests failed");
        }

        const [trendData, popData, topData] = await Promise.all([
          trendRes.json(),
          popRes.json(),
          topRes.json(),
        ]);

        const map = (results: unknown[]): Movie[] =>
          results.map((m) => {
            const r = m as Record<string, unknown>;
            return {
              id: Number(r.id),
              title: (r.title ?? r.name) as string,
              genre: type === "movie" ? "Movie" : "Series",
              year: ((r.release_date ?? r.first_air_date) as string | undefined)?.slice(0, 4) ?? "",
              image: `https://image.tmdb.org/t/p/w780${(r.backdrop_path ?? r.poster_path) as string}`,
              contentType: type === "tv" ? "series" : "movie",
            };
          });

        setFeatured(map(trendData.results || [])[0] || null);
        setTrending(map(trendData.results || []));
        setPopular(map(popData.results || []));
        setTopRated(map(topData.results || []));
      } catch (err) {
        console.error(err);
        setFeatured(null);
        setTrending([]);
        setPopular([]);
        setTopRated([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [type]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Loading...
      </main>
    );
  }

  if (!featured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Failed to load movies.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <GlassNavbar />

      <BrowseHero movie={featured} type={type === "tv" ? "series" : "movie"} />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <ContinueWatchingRow />

        <MovieRow
          title={type === "movie" ? "Trending Movies" : "Trending Series"}
          movies={trending}
        />

        <MovieRow
          title={type === "movie" ? "Popular Movies" : "Popular Series"}
          movies={popular}
        />

        <MovieRow
          title={
            type === "movie"
              ? "Award Winning Movies"
              : "Award Winning Series"
          }
          movies={topRated}
        />
      </div>
    </main>
  );
}
