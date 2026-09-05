"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import GlassNavbar from "@/components/layout/GlassNavbar";
import BrowseHero from "@/components/browse/BrowseHero";
import MovieRow from "@/components/browse/MovieRow";
import ContinueWatchingRow from "@/components/continue-watching/ContinueWatchingRow";
import ShimmerCard from "@/components/ui/ShimmerCard";
import AmbientBackdrop from "@/components/ui/AmbientBackdrop";
import type { Movie } from "@/components/movies/MovieCard";

const EASE = [0.23, 1, 0.32, 1] as const;

const ROWS = [
  { key: "trending", title: "Trending Now", index: "01", count: "This Week" },
  { key: "popular", title: "Popular", index: "02", count: "All Time" },
  {
    key: "topRated",
    title: "Critically Acclaimed",
    index: "03",
    count: "Top Rated",
  },
] as const;

export default function BrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [featured, setFeatured] = useState<Movie | null>(null);
  const [rows, setRows] = useState<Record<string, Movie[]>>({});
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
              year:
                ((r.release_date ?? r.first_air_date) as string | undefined)
                  ?.slice(0, 4) ?? "",
              image: `https://image.tmdb.org/t/p/w780${(r.backdrop_path ?? r.poster_path) as string}`,
              contentType: type === "tv" ? "series" : "movie",
            };
          });

        const trendMovies = map(trendData.results || []);
        setFeatured(trendMovies[0] || null);
        setRows({
          trending: trendMovies,
          popular: map(popData.results || []),
          topRated: map(topData.results || []),
        });
      } catch (err) {
        console.error(err);
        setFeatured(null);
        setRows({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <AmbientBackdrop />

      <div className="relative z-10">
        <GlassNavbar />

        {/* Hero — always show, or show skeleton if loading */}
        {loading ? (
          <section className="relative flex min-h-[78vh] items-end overflow-hidden md:min-h-[88vh]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
            <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 md:pb-24">
              <div className="mb-6 h-px w-24 animate-pulse bg-white/10" />
              <div className="space-y-3">
                <div className="h-12 w-3/4 animate-pulse rounded-full bg-white/[0.06] md:h-16" />
                <div className="h-12 w-1/2 animate-pulse rounded-full bg-white/[0.06] md:h-16" />
              </div>
              <div className="mt-8 flex gap-3">
                <div className="h-12 w-36 animate-pulse rounded-full bg-white/[0.05]" />
                <div className="h-12 w-36 animate-pulse rounded-full bg-white/[0.05]" />
              </div>
            </div>
          </section>
        ) : featured ? (
          <BrowseHero movie={featured} type={type === "tv" ? "series" : "movie"} />
        ) : null}

        {/* Catalogue */}
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          {loading ? (
            <div className="space-y-20">
              {ROWS.map((row) => (
                <div key={row.key}>
                  <div className="mb-7 h-7 w-48 animate-pulse rounded-full bg-white/[0.05]" />
                  <div className="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ShimmerCard key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !featured ? (
            <EmptyState />
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
              }}
              className="space-y-20"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
                }}
              >
                <ContinueWatchingRow />
              </motion.div>

              {ROWS.map((row) => (
                <motion.div
                  key={row.key}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
                  }}
                >
                  <MovieRow
                    title={row.title}
                    index={row.index}
                    count={row.count}
                    movies={rows[row.key] || []}
                  />
                </motion.div>
              ))}

              {/* Closing footer mark */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.8 } },
                }}
                className="pt-12 text-center"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/30">
                  End of catalogue · {new Date().getFullYear()}
                </span>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
        Signal lost
      </p>
      <p className="mt-2 text-sm font-light text-white/65">
        Failed to load movies. Please try again.
      </p>
    </div>
  );
}
