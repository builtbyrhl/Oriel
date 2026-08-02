"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import WatchlistButton from "@/components/watchlist/WatchlistButton";

type Movie = {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  release_date: string;
  vote_average: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p/w500";

export default function SearchDrawer({
  open,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMovies([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${API}&query=${encodeURIComponent(query)}`
        );

        const data = await res.json();
        setMovies(data.results || []);
      } catch {
        setMovies([]);
      }

      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-[#090909] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-light">
            Search
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-6">

          <div className="flex items-center rounded-full bg-white/10 px-4 py-3">
            <Search size={18} />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any movie..."
              className="ml-3 w-full bg-transparent outline-none"
            />
          </div>

          {loading && (
            <div className="mt-6 space-y-4">
              {[1,2,3].map((i)=>(
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-white/10"
                />
              ))}
            </div>
          )}

          {!loading && (
            <div className="mt-6 space-y-4">

              {movies.map((movie)=>(
                <div
                  key={movie.id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 p-2 transition hover:bg-white/10"
                >

                  <Link
                    href={`/movie/${movie.id}`}
                    onClick={onClose}
                    className="flex flex-1 items-center gap-3"
                  >

                    <img
                      src={
                        movie.poster_path
                          ? IMG + movie.poster_path
                          : "https://placehold.co/80x120"
                      }
                      className="h-20 w-14 rounded-lg object-cover"
                      alt={movie.title}
                    />

                    <div>
                      <h3 className="font-medium">
                        {movie.title}
                      </h3>

                      <p className="text-sm text-white/50">
                        {(movie.release_date || "").slice(0,4)}
                      </p>
                    </div>

                  </Link>

                  <div
                    onClick={(e)=>{
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <WatchlistButton
                      movie={{
                        id: movie.id,
                        title: movie.title,
                        poster: movie.poster_path
                          ? IMG + movie.poster_path
                          : "",
                        backdrop: movie.backdrop_path
                          ? IMG + movie.backdrop_path
                          : "",
                        year: (movie.release_date || "").slice(0,4),
                        rating: movie.vote_average,
                      }}
                    />
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>
      </aside>
    </>
  );
}
