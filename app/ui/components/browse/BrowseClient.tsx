"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import MovieRow from "@/components/movies/MovieRow";
import ContinueWatchingRow from "@/components/continue-watching/ContinueWatchingRow";
import type { Movie } from "@/components/movies/MovieCard";

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [featured, setFeatured] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(false);

        const res = await fetch(
          `/api/trending?type=${type}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(`Trending request failed: ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data.results)) {
          throw new Error("Invalid trending response");
        }

        const movies: Movie[] = data.results
          .filter((m: any) => m && m.id)
          .map((m: any) => ({
            id: m.id,
            title: m.title || m.name || "Untitled",
            genre: type === "movie" ? "Movie" : "Series",
            year: (m.release_date || m.first_air_date || "").slice(0, 4),
            image: m.backdrop_path || m.poster_path
              ? `https://image.tmdb.org/t/p/w780${
                  m.backdrop_path || m.poster_path
                }`
              : "",
          }));

        if (!movies.length) {
          throw new Error("No movies returned");
        }

        setFeatured(movies[0]);
        setTrending(movies);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Browse loading error:", err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [type]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Loading...
      </main>
    );
  }

  if (error || !featured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white">
        <p className="text-lg">Failed to load movies.</p>
        <p className="mt-2 text-sm text-white/50">
          Please try refreshing the page.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <GlassNavbar />

      <section className="relative h-[55vh] md:h-[70vh] overflow-hidden">
        {featured.image && (
          <img
            src={featured.image}
            alt={featured.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/50 to-black/10" />

        <div className="relative flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-6 pb-10 md:pb-16">
            <p className="mb-2 uppercase tracking-[0.3em] text-white/70">
              {type === "movie" ? "Featured Movie" : "Featured Series"}
            </p>

            <h1 className="text-4xl font-light md:text-7xl">
              {featured.title}
            </h1>

            <p className="mt-4 max-w-xl text-white/70">
              Cinema. Beautifully curated.
            </p>

            <button className="mt-6 md:mt-8 rounded-full border border-white/20 bg-white/10 px-8 py-3 backdrop-blur-xl transition hover:bg-white/20">
              Continue
            </button>
          </div>
        </div>
      </section>

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
