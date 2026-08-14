"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import SpinToExplore from "@/components/browse/SpinToExplore";
import RhythmSection from "@/components/browse/RhythmSection";
import ThisWeekSection from "@/components/browse/ThisWeekSection";
import type { Movie } from "@/components/movies/MovieCard";
import {
  fetchDiscovery,
  type DiscoveryQuery,
} from "@/lib/oriel/discovery-client";
import { fetchTrending } from "@/lib/tmdb/trending-client";

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  // The page lands on a valid curated intent so the Spin request is always
  // well-formed from the first paint (the engine requires genre and/or mood).
  const [query, setQuery] = useState<DiscoveryQuery>({ genre: "Drama" });
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [weekly, setWeekly] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const [curated, trending] = await Promise.allSettled([
          fetchDiscovery({
            genre: query.genre,
            mood: query.mood,
            mediaType: type,
            limit: 40,
          }),
          fetchTrending(type),
        ]);

        if (cancelled) return;

        if (curated.status === "rejected") {
          console.error("Discovery request failed", curated.reason);
        }
        if (trending.status === "rejected") {
          console.error("Trending request failed", trending.reason);
        }

        setFeatured(
          trending.status === "fulfilled" ? trending.value[0] || null : null
        );
        setMovies(curated.status === "fulfilled" ? curated.value : []);
        setWeekly(trending.status === "fulfilled" ? trending.value : []);
      } catch (err) {
        console.error(err);

        if (cancelled) return;

        setFeatured(null);
        setMovies([]);
        setWeekly([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
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
        <SpinToExplore value={query} onChange={setQuery} mediaType={type} />

        <RhythmSection movies={movies} />

        <ThisWeekSection movies={weekly} />

        <p className="py-16 text-center text-[11px] font-medium uppercase tracking-[0.3em] text-white/20">
          Oriel · Cinematic discovery, without the streaming-wall feeling
        </p>
      </main>
    </main>
  );
}
