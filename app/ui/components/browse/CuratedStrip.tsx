"use client";

import MovieCard, { Movie } from "@/components/movies/MovieCard";

type Props = {
  title: string;
  movies: Movie[];
};

/**
 * A single editorial filmstrip for the current selection — one visual band,
 * not a stack of generic streaming rows. Existing MovieCard is reused as-is.
 */
export default function CuratedStrip({ title, movies }: Props) {
  return (
    <section>
      <div className="mb-6 flex items-center gap-4">
        <h2 className="whitespace-nowrap text-lg font-light tracking-wide text-white">
          {title}
        </h2>
        <span className="h-px flex-1 bg-white/8" />
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="min-w-[46vw] snap-start sm:min-w-[180px] lg:min-w-[190px]"
          >
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
