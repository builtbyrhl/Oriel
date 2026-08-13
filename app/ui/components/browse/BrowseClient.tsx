"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import ContinueWatchingSection from "@/components/browse/ContinueWatchingSection";
import SpinToExplore from "@/components/browse/SpinToExplore";
import RhythmSection from "@/components/browse/RhythmSection";
import ThisWeekSection from "@/components/browse/ThisWeekSection";
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

      <main className="mx-auto max-w-7xl px-5 md:px-6">
        <ContinueWatchingSection />

        <SpinToExplore value={query} onChange={setQuery} movies={movies} />

        <RhythmSection movies={movies} />

        <ThisWeekSection movies={movies} />

        <p className="py-16 text-center text-[11px] font-medium uppercase tracking-[0.3em] text-white/20">
          Oriel · Cinematic discovery, without the streaming-wall feeling
        </p>
      </main>
    </main>
  );
}
