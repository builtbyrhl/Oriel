"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import GlassNavbar from "@/components/layout/GlassNavbar";
import ContinueWatchingSection from "@/components/home/ContinueWatchingSection";
import SpinCarouselSection from "@/components/home/SpinCarouselSection";
import RhythmField from "@/components/home/RhythmField";
import TrendingWave, { type WaveMovie } from "@/components/home/TrendingWave";

type Movie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  poster: string;
  contentType: "movie" | "series";
};

const EASE = [0.23, 1, 0.32, 1] as const;

export default function HomeClient() {
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [rows, setRows] = useState<Record<string, Movie[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trendRes, popRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=movie`, { cache: "no-store" }),
          fetch(`/api/tmdb/popular?type=movie`, { cache: "no-store" }),
          fetch(`/api/tmdb/top-rated?type=movie`, { cache: "no-store" }),
        ]);

        const [trendData, popData, topData] = await Promise.all([
          trendRes.json(), popRes.json(), topRes.json(),
        ]);

        if (cancelled) return;

        const map = (results: unknown[]): Movie[] =>
          (results as Record<string, unknown>[]).map((r) => ({
            id: Number(r.id),
            title: (r.title ?? r.name) as string,
            genre: "Film",
            year: ((r.release_date ?? r.first_air_date) as string | undefined)?.slice(0, 4) ?? "",
            image: `https://image.tmdb.org/t/p/w780${(r.backdrop_path ?? r.poster_path) as string}`,
            poster: `https://image.tmdb.org/t/p/w500${(r.poster_path ?? r.backdrop_path) as string}`,
            contentType: "movie" as const,
          }));

        const trend = map(trendData.results || []);
        const popular = map(popData.results || []);
        const top = map(topData.results || []);

        setFeatured(trend[0] || null);
        setRows({ trending: trend, popular, topRated: top });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Deduplicated, poster-ready mix for the rhythm room.
  const rhythmMovies: WaveMovie[] = (() => {
    const seen = new Set<number>();
    const acc: WaveMovie[] = [];
    for (const m of [rows.trending, rows.popular, rows.topRated].flat()) {
      if (!m || seen.has(m.id)) continue;
      seen.add(m.id);
      if (!m.poster.includes("/")) continue;
      acc.push({
        id: m.id,
        title: m.title,
        poster: m.poster,
        year: m.year,
        contentType: m.contentType,
      });
      if (acc.length >= 10) break;
    }
    return acc;
  })();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(15,14,25,0.95) 0%, #050507 55%, #000000 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <GlassNavbar />

        {/* Hero */}
        {loading ? (
          <div className="relative flex min-h-screen items-end overflow-hidden">
            <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            <div className="relative mx-auto w-full max-w-7xl px-8 pb-24 md:px-12 md:pb-32">
              <div className="space-y-4">
                <div className="h-px w-16 animate-pulse bg-white/10" />
                <div className="h-14 w-3/4 animate-pulse rounded-full bg-white/[0.06] md:h-20" />
                <div className="h-14 w-1/2 animate-pulse rounded-full bg-white/[0.04] md:h-20" />
                <div className="mt-8 h-12 w-36 animate-pulse rounded-full bg-white/[0.04]" />
              </div>
            </div>
          </div>
        ) : featured ? (
          <HomeHero movie={featured} />
        ) : null}

        {/* Content */}
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28">
          {loading ? (
            <div className="space-y-20">
              <div className="h-[50vh]" />
              <div className="flex gap-5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="aspect-video w-[300px] animate-pulse rounded-[20px] bg-white/[0.03]" />
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
              }}
              className="space-y-32 md:space-y-44"
            >
              {/* 01 — glass continue watching */}
              <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } } }}>
                <ContinueWatchingSection />
              </motion.div>

              {/* 02 — the reel */}
              <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } } }}>
                <SpinCarouselSection type="movie" />
              </motion.div>

              {/* 03 — the rhythm room */}
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}>
                {rhythmMovies.length >= 6 && <RhythmField movies={rhythmMovies} />}
              </motion.div>

              {/* 04 — the tide */}
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}>
                <TrendingWave movies={rows.trending || []} />
              </motion.div>

              {/* Footer */}
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1 } } }}
                className="pt-8 text-center"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.6em] text-white/12">
                  End of tide · {new Date().getFullYear()}
                </span>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

function HomeHero({ movie }: { movie: Movie }) {
  const href = `/movie/${movie.id}`;

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: EASE }}
        className="absolute inset-0"
      >
        <img
          src={movie.image}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Grading overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(5,5,7,0.2) 0%, rgba(5,5,7,0.05) 35%, rgba(5,5,7,0.65) 70%, #050507 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, rgba(5,5,7,0.9) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-end pb-20 md:pb-32">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
            }}
          >
            {/* Eyebrow */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
              }}
              className="mb-8 flex items-center gap-4"
            >
              <span className="block h-px w-12 bg-white/20" />
              <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/45">
                Now playing · Featured
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
              }}
              className="max-w-3xl text-5xl font-extralight leading-[0.95] tracking-tight text-white md:text-7xl lg:text-[88px]"
            >
              {movie.title}
            </motion.h1>

            {/* Meta */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
              }}
              className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tracking-widest text-white/50"
            >
              <span>{movie.year}</span>
              <span className="h-3 w-px bg-white/20" />
              <span>{movie.genre}</span>
              <span className="h-3 w-px bg-white/20" />
              <span className="flex items-center gap-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-white/40" />
                4K · HDR
              </span>
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
              }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                href={href}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-medium text-black transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Watch now</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/browse"
                className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-light text-white backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10"
              >
                <span>Browse catalogue</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#050507]" />
    </section>
  );
}