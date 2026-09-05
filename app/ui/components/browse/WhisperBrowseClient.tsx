"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import GlassNavbar from "@/components/layout/GlassNavbar";
import WhisperHero from "@/components/browse/WhisperHero";
import OrbitalWheelSection from "@/components/browse/OrbitalWheelSection";
import HoverExpandList from "@/components/browse/HoverExpandList";
import WhisperRow from "@/components/browse/WhisperRow";
import WhisperContinueWatching from "@/components/continue-watching/WhisperContinueWatching";
import type { Movie } from "@/components/movies/MovieCard";

type RowMovie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

const ROWS = [
  { key: "trending", title: "Trending", index: "03" },
  { key: "popular", title: "Popular", index: "04" },
  { key: "topRated", title: "Critically Acclaimed", index: "05" },
] as const;

const EASE = [0.23, 1, 0.32, 1] as const;

export default function WhisperBrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [featured, setFeatured] = useState<RowMovie | null>(null);
  const [rows, setRows] = useState<Record<string, RowMovie[]>>({});
  const [expandItems, setExpandItems] = useState<{
    id: number; title: string; subtitle: string; image: string;
    rating: number; year: string; description: string; contentType: "movie" | "series";
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [trendRes, popRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/popular?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }),
        ]);

        const [trendData, popData, topData] = await Promise.all([
          trendRes.json(),
          popRes.json(),
          topRes.json(),
        ]);

        if (cancelled) return;

        const map = (results: unknown[]): RowMovie[] =>
          (results as Record<string, unknown>[]).map((r) => ({
            id: Number(r.id),
            title: (r.title ?? r.name) as string,
            genre: type === "movie" ? "Movie" : "Series",
            year: ((r.release_date ?? r.first_air_date) as string | undefined)?.slice(0, 4) ?? "",
            image: `https://image.tmdb.org/t/p/w780${(r.backdrop_path ?? r.poster_path) as string}`,
            contentType: type === "tv" ? "series" : "movie",
          }));

        const trend = map(trendData.results || []);
        setFeatured(trend[0] || null);
        setRows({
          trending: trend,
          popular: map(popData.results || []),
          topRated: map(topData.results || []),
        });

        // Expand list — use trending movies with descriptions
        const expand = trend.slice(0, 6).map((m) => ({
          ...m,
          subtitle: m.genre,
          description: "A featured selection from the trending catalogue.",
          image: m.image,
          rating: 8.0,
        }));
        setExpandItems(expand);
      } catch (err) {
        console.error(err);
        setFeatured(null);
        setRows({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [type]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 100% 70% at 50% 0%, rgba(20,18,30,0.8) 0%, #050507 55%, #000000 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <GlassNavbar />

        {/* Hero */}
        {loading ? (
          <div className="min-h-[90vh]" />
        ) : featured ? (
          <WhisperHero movie={featured as never} type={type === "tv" ? "series" : "movie"} />
        ) : null}

        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          {loading ? (
            <div className="space-y-16">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-4">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/[0.02]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !featured ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/20">No signal</p>
            </div>
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
              {/* Orbital Wheel — Editor's Picks */}
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } } }}
              >
                <OrbitalWheelSection type={type} />
              </motion.div>

              {/* Hover Expand — Featured (skipper-ui style) */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
              >
                <HoverExpandList
                  title="Featured"
                  index="01"
                  items={expandItems}
                />
              </motion.div>

              {/* Standard rows */}
              {ROWS.map((row) => (
                <motion.div
                  key={row.key}
                  variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
                >
                  <WhisperRow
                    title={row.title}
                    index={row.index}
                    movies={rows[row.key] || []}
                  />
                </motion.div>
              ))}

              {/* Continue watching */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
              >
                <WhisperContinueWatching />
              </motion.div>

              {/* Footer */}
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1 } } }}
                className="pt-16 text-center"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.6em] text-white/12">
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
