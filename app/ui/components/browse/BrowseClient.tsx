"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import SpinToExplore from "@/components/browse/SpinToExplore";
import SelectedMoviePanel from "@/components/browse/SelectedMoviePanel";
import CuratedStrip from "@/components/browse/CuratedStrip";
import ReservedSection from "@/components/browse/ReservedSection";
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
        <SpinToExplore value={query} onChange={setQuery} />

        {featured && (
          <div className="mt-16">
            <SelectedMoviePanel movie={featured} />
          </div>
        )}

        {movies.length > 1 && (
          <div className="mt-16">
            <CuratedStrip
              title={
                query.genre || query.mood
                  ? "The Selection"
                  : "Trending Now"
              }
              movies={movies}
            />
          </div>
        )}

        <div className="mt-16 space-y-10">
          <ReservedSection
            eyebrow="Curated"
            title="Visual Collections"
            description="Hand-picked visual sections will live here — editorial strips, mood boards, and themed galleries."
          />
          <ReservedSection
            eyebrow="Recommendations"
            title="Trading-style Signal Feed"
            description="A live, trading-style recommendation stream with directional signals will land in this reserved space."
          />
        </div>
      </div>
    </main>
  );
}
