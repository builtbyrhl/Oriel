"use client";

import { useEffect, useState } from "react";
import GlassNavbar from "@/components/layout/GlassNavbar";
import MovieRow from "@/components/movies/MovieRow";
import type { Movie } from "@/components/movies/MovieCard";

const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export default function BrowsePage() {
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/movie/week?api_key=${API}`
        );

        const data = await res.json();

        const movies: Movie[] = data.results.map((m: any) => ({
          id: m.id,
          title: m.title,
          genre: "Movie",
          year: (m.release_date || "").slice(0,4),
          image: `https://image.tmdb.org/t/p/w780${m.backdrop_path || m.poster_path}`
        }));

        setFeatured(movies[0]);
        setTrending(movies);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        Loading...
      </main>
    );
  }

  if (!featured) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        Failed to load movies.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      <GlassNavbar />

      <section className="relative h-[70vh] overflow-hidden">

        <img
          src={featured.image}
          alt={featured.title}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/50 to-black/10"/>

        <div className="relative flex h-full items-end">

          <div className="mx-auto w-full max-w-7xl px-6 pb-16">

            <p className="mb-2 uppercase tracking-[0.3em] text-white/70">
              Featured
            </p>

            <h1 className="text-5xl font-light md:text-7xl">
              {featured.title}
            </h1>

            <p className="mt-4 max-w-xl text-white/70">
              Cinema. Beautifully curated.
            </p>

            <button className="mt-8 rounded-full border border-white/20 bg-white/10 px-8 py-3 backdrop-blur-xl hover:bg-white/20 transition">
              Continue
            </button>

          </div>

        </div>

      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">

        <MovieRow
          title="Trending Now"
          movies={trending}
        />

        <MovieRow
          title="Popular"
          movies={trending}
        />

        <MovieRow
          title="Award Winners"
          movies={trending}
        />

      </div>

    </main>
  );
}
