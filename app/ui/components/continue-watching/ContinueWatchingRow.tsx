"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ContinueMovie,
  getContinueWatching,
} from "@/lib/continueWatching";

export default function ContinueWatchingRow() {
  const [movies, setMovies] = useState<ContinueMovie[]>([]);

  useEffect(() => {
    setMovies(getContinueWatching());
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-light text-white">
          Continue Watching
        </h2>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            className="min-w-[190px] snap-start"
          >
            <div className="overflow-hidden rounded-[28px] bg-neutral-900">

              <img
                src={movie.poster}
                alt={movie.title}
                className="aspect-[2/3] w-full object-cover"
              />

              <div className="p-4">

                <h3 className="truncate text-lg font-medium text-white">
                  {movie.title}
                </h3>

                <p className="mt-1 text-sm text-white/60">
                  {movie.year}
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${movie.progress}%`,
                    }}
                  />
                </div>

              </div>

            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
