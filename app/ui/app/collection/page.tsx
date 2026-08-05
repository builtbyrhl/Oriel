"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import GlassNavbar from "@/components/layout/GlassNavbar";
import { getNavbarVariant } from "@/lib/visual/navbar";
import { getContext } from "@/lib/visual/context";
import CollectionFilters from "@/components/collection/CollectionFilters";
import {
  getWatchlist,
  removeFromWatchlist,
  WatchlistMovie,
} from "@/lib/watchlist";

export default function CollectionPage() {
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    setMovies(getWatchlist());
  }, []);

  function removeMovie(id: number) {
    removeFromWatchlist(id);
    setMovies(getWatchlist());
  }

  const filtered = useMemo(() => {
    let data = [...movies];

    if (query.trim()) {
      data = data.filter((m) =>
        m.title.toLowerCase().includes(query.toLowerCase())
      );
    }

    switch (sort) {
      case "name":
        data.sort((a, b) => a.title.localeCompare(b.title));
        break;

      case "rating":
        data.sort((a, b) => b.rating - a.rating);
        break;
    }

    return data;
  }, [movies, query, sort]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      <GlassNavbar variant={getNavbarVariant({ context: getContext("collection") })} />

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 pt-24 md:pt-28 pb-12">

          <p className="uppercase tracking-[0.35em] text-white/50">
            Library
          </p>

          <h1 className="mt-4 text-4xl md:text-6xl font-light">
            Collection
          </h1>

          <p className="mt-5 max-w-2xl text-base md:text-lg text-white/60">
            Every movie you've chosen to keep.
          </p>

          <div className="mt-4 text-sm text-white/50">
            {filtered.length} movie{filtered.length !== 1 ? "s" : ""}
          </div>

          <div className="mt-10 flex flex-col gap-4 md:flex-row">

            <div className="flex flex-1 items-center rounded-full bg-white/10 px-4 py-3">
              <Search size={18} />

              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Search your collection..."
                className="ml-3 w-full bg-transparent outline-none"
              />
            </div>

            <CollectionFilters
              value={sort}
              onChange={setSort}
            />

          </div>

        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">

        {filtered.length === 0 ? (

          <div className="mx-auto max-w-xl py-28 text-center">

            <div className="text-8xl">
              ❤️
            </div>

            <h2 className="mt-8 text-4xl font-light">
              Your Collection Awaits
            </h2>

            <p className="mx-auto mt-5 max-w-md text-base md:text-lg leading-8 text-white/55">
              Every unforgettable movie starts with a single save.
              Discover films you'll want to keep forever.
            </p>

            <Link
              href="/browse"
              className="mt-10 inline-flex rounded-full border border-white/10 bg-white/10 px-8 py-4 backdrop-blur-xl transition hover:bg-white/20"
            >
              Browse Movies
            </Link>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">

            {filtered.map((movie)=>(

              <div key={movie.id} className="group">

                <Link href={`/movie/${movie.id}`}>

                  <div className="overflow-hidden rounded-[22px] md:rounded-[28px] bg-neutral-900">

                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                  </div>

                </Link>

                <div className="mt-2 md:mt-3 flex items-start justify-between gap-3">

                  <div className="min-w-0 flex-1">

                    <h3 className="truncate text-[15px] md:text-lg font-medium leading-tight">
                      {movie.title}
                    </h3>

                    <p className="mt-1 text-sm text-white/50">
                      {movie.year}
                    </p>

                  </div>

                  <button
                    onClick={() => removeMovie(movie.id)}
                    className="shrink-0 rounded-full p-2 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={18}/>
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}
