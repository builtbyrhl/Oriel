"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import GlassNavbar from "@/components/layout/GlassNavbar";
import WhisperHero from "@/components/browse/WhisperHero";
import WhisperRow from "@/components/browse/WhisperRow";
import CardStackSection from "@/components/browse/CardStackSection";
import WhisperContinueWatching from "@/components/continue-watching/WhisperContinueWatching";

const EASE = [0.25, 0.1, 0.25, 1] as const;

const ROWS = [
  { key: "trending", title: "Trending", index: "03" },
  { key: "popular", title: "Popular", index: "04" },
  { key: "topRated", title: "Critically Acclaimed", index: "05" },
] as const;

type RowMovie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

export default function WhisperBrowseClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [featured, setFeatured] = useState<RowMovie | null>(null);
  const [rows, setRows] = useState<Record<string, RowMovie[]>>({});
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
    <main className="relative min-h-screen overflow-hidden bg-[#0a0807] text-[#f5f1ea]">
      {/* Subtle ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(30,25,20,0.6) 0%, #0a0807 60%, #000000 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <GlassNavbar />

        {/* Hero */}
        {loading ? (
          <div className="min-h-[90vh]" />
        ) : featured ? (
          <WhisperHero movie={featured} type={type === "tv" ? "series" : "movie"} />
        ) : null}

        {/* Catalogue */}
        <div className="mx-auto max-w-7xl px-8 py-20 md:px-12 md:py-28">
          {loading ? (
            <div className="space-y-16">
              {["01", "02", "03"].map((n) => (
                <div key={n}>
                  <div className="mb-10 flex items-baseline gap-6">
                    <span className="font-mono text-[10px] tabular-nums tracking-[0.3em] text-[#d4af37]/30">
                      {n}
                    </span>
                    <div className="h-4 w-40 animate-pulse rounded-full bg-[#f5f1ea]/[0.04]" />
                    <div className="h-px flex-1 bg-[#f5f1ea]/[0.04]" />
                  </div>
                  <div className="-mx-8 flex gap-4 px-8 overflow-x-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="min-w-[150px] rounded-[12px] overflow-hidden bg-[#12100e] md:min-w-[200px]"
                      >
                        <div className="aspect-[2/3] animate-pulse bg-[#f5f1ea]/[0.03]" />
                        <div className="p-3.5">
                          <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#f5f1ea]/[0.04]" />
                          <div className="mt-2 h-2 w-1/3 animate-pulse rounded-full bg-[#f5f1ea]/[0.03]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !featured ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#f5f1ea]/25">
                No signal
              </p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.18 } },
              }}
              className="space-y-20"
            >
              {/* Continue watching */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}
              >
                <WhisperContinueWatching />
              </motion.div>

              {/* Card stack carousel */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}
              >
                <CardStackSection type={type} />
              </motion.div>

              {/* Catalogue rows */}
              {ROWS.map((row) => (
                <motion.div
                  key={row.key}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}
                >
                  <WhisperRow
                    title={row.title}
                    index={row.index}
                    movies={rows[row.key] || []}
                  />
                </motion.div>
              ))}

              {/* Footer mark */}
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1.2 } } }}
                className="pt-16 text-center"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.6em] text-[#f5f1ea]/15">
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
