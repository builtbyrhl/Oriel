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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/tmdb/trending?type=${type}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(`Trending request failed: ${res.status}`);
        }

        const data = await res.json();

        const movies: Movie[] = (data.results || []).map((m: any) => ({
          id: m.id,
          title: m.title || m.name,
          genre: type === "movie" ? "Movie" : "Series",
          year: (m.release_date || m.first_air_date || "").slice(0, 4),
          image: `https://image.tmdb.org/t/p/w780${
            m.backdrop_path || m.poster_path
          }`,
          contentType:
            type === "tv" ? "series" : "movie",
        }));

        setFeatured(movies[0] || null);
        setTrending(movies);
      } catch (err) {
        console.error(err);
        setFeatured(null);
        setTrending([]);
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
          movies={trending}
        />

        <MovieRow
          title={
            type === "movie"
              ? "Award Winning Movies"
              : "Award Winning Series"
          }
          movies={trending}
        />
      </div>
    </main>
  );
}
