"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import GlassNavbar from "@/components/layout/GlassNavbar";
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

      <GlassNavbar />

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 pt-28 pb-12">

          <p className="uppercase tracking-[0.35em] text-white/50">
            Library
          </p>

          <h1 className="mt-4 text-6xl font-light">
            Collection
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/60">
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

            <select
              value={sort}
              onChange={(e)=>setSort(e.target.value)}
              className="rounded-full bg-white/10 px-5 py-3 outline-none"
            >
              <option value="recent">Recently Added</option>
              <option value="name">A-Z</option>
              <option value="rating">Highest Rated</option>
            </select>

          </div>

        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">

        {filtered.length === 0 ? (

          <div className="py-24 text-center">

            <div className="text-7xl">❤️</div>

            <h2 className="mt-6 text-3xl font-light">
              Your collection is empty
            </h2>

            <p className="mt-4 text-white/50">
              Save movies with the + button to see them here.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">

            {filtered.map((movie)=>(

              <div key={movie.id} className="group">

                <Link href={`/movie/${movie.id}`}>

                  <div className="overflow-hidden rounded-[28px] bg-neutral-900">

                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                  </div>

                </Link>

                <div className="mt-3 flex items-center justify-between">

                  <div>

                    <h3 className="truncate text-lg">
                      {movie.title}
                    </h3>

                    <p className="text-sm text-white/50">
                      {movie.year}
                    </p>

                  </div>

                  <button
                    onClick={() => removeMovie(movie.id)}
                    className="rounded-full p-2 transition hover:bg-red-500/20"
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
