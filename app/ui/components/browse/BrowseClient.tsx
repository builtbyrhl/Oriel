"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import ExploreBar from "@/components/browse/ExploreBar";
import MovieRow from "@/components/movies/MovieRow";
import ContinueWatchingRow from "@/components/continue-watching/ContinueWatchingRow";
import type { Movie } from "@/components/movies/MovieCard";
import {
  fetchDiscovery,
  type DiscoveryQuery,
} from "@/lib/oriel/discovery-client";

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [query, setQuery] = useState<DiscoveryQuery>({});
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const curated = await fetchDiscovery({
          genre: query.genre,
          mood: query.mood,
          mediaType: type,
          limit: 40,
        });

        setFeatured(curated[0] || null);
        setMovies(curated);
      } catch (err) {
        console.error(err);
        setFeatured(null);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [type, query]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <GlassNavbar />

      {featured ? (
        <BrowseHero
          movie={featured}
          type={type === "tv" ? "series" : "movie"}
        />
      ) : (
        <div className="h-[60vh] bg-gradient-to-b from-neutral-900 to-[#050505]" />
      )}

      <div className="mx-auto max-w-7xl px-6 py-10">
        <ExploreBar value={query} onChange={setQuery} />

        <ContinueWatchingRow />

        {movies.length > 0 ? (
          <MovieRow
            title={
              query.genre || query.mood
                ? `${query.genre || "Any"} · ${query.mood || "Any mood"}`
                : type === "movie"
                  ? "Trending Movies"
                  : "Trending Series"
            }
            movies={movies}
          />
        ) : (
          <p className="py-10 text-center text-white/50">
            No titles match those filters yet.
          </p>
        )}
      </div>
    </main>
  );
}
