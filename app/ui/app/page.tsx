"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import MovieRow from "@/components/movies/MovieRow";
import type { Movie } from "@/components/movies/MovieCard";

function mapResults(results: unknown[], type: "movie" | "tv"): Movie[] {
  return results.map((m) => {
    const r = m as Record<string, unknown>;
    return {
      id: Number(r.id),
      title: (r.title ?? r.name) as string,
      genre: type === "movie" ? "Movie" : "Series",
      year: ((r.release_date ?? r.first_air_date) as string | undefined)?.slice(0, 4) ?? "",
      image: `https://image.tmdb.org/t/p/w780${(r.backdrop_path ?? r.poster_path) as string}`,
      contentType: type === "tv" ? "series" : "movie",
    };
  });
}

function HomeCatalogue({ type }: { type: "movie" | "tv" }) {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [trendRes, popRes, topRes] = await Promise.all([
          fetch(`/api/tmdb/trending?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/popular?type=${type}`, { cache: "no-store" }),
          fetch(`/api/tmdb/top-rated?type=${type}`, { cache: "no-store" }),
        ]);
        if (!trendRes.ok || !popRes.ok || !topRes.ok) return;
        const [trendData, popData, topData] = await Promise.all([
          trendRes.json(), popRes.json(), topRes.json(),
        ]);
        if (cancelled) return;
        setTrending(mapResults(trendData.results || [], type));
        setPopular(mapResults(popData.results || [], type));
        setTopRated(mapResults(topData.results || [], type));
        setLoaded(true);
      } catch { /* silence */ }
    }
    load();
    return () => { cancelled = true; };
  }, [type]);

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-14">
      <h2 className="text-xl font-extralight tracking-[0.2em] uppercase text-white/50">
        Catalogue
      </h2>
      <MovieRow title={type === "movie" ? "Trending Movies" : "Trending Series"} movies={trending} />
      <MovieRow title={type === "movie" ? "Popular Movies" : "Popular Series"} movies={popular} />
      <MovieRow title={type === "movie" ? "Award Winning Movies" : "Award Winning Series"} movies={topRated} />
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#08090d] text-white">

      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1b2233_0%,#0f1420_35%,#08090d_80%)]" />
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[180px]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(white 0.6px, transparent 0.6px)", backgroundSize: "28px 28px" }}
        />
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col items-center text-center px-6"
      >
        <motion.h1
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.45em" }}
          transition={{ duration: 1.2 }}
          className="text-6xl font-extralight tracking-[0.45em] md:text-8xl"
        >
          ORIEL
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-6 max-w-md text-sm font-light leading-7 tracking-wide text-zinc-300"
        >
          Cinema. Beautifully curated.
        </motion.p>

        <Link href="/browse">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="group mt-16 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <span className="text-sm tracking-wide">Enter</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </Link>
      </motion.section>

      {/* Catalogue */}
      <HomeCatalogue type="movie" />
    </main>
  );
}