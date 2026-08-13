import WatchlistButton from "@/components/watchlist/WatchlistButton";
import type { Movie } from "@/components/movies/MovieCard";

type Props = {
  movie: Movie;
};

/**
 * The selected-movie area that sits directly below the Spin to Explore
 * section. Shows the landed title's art and identity metadata, with a
 * reserved synopsis slot that richer titles will fill in later.
 */
export default function SelectedMoviePanel({ movie }: Props) {
  return (
    <section className="grid gap-8 md:grid-cols-[240px_1fr] md:gap-12">
      <div className="relative">
        <img
          src={movie.image}
          alt={movie.title}
          className="aspect-[2/3] w-full rounded-[28px] border border-white/8 object-cover"
        />
        <div className="absolute right-4 top-4">
          <WatchlistButton
            movie={{
              id: movie.id,
              title: movie.title,
              poster: movie.image,
              backdrop: movie.image,
              year: movie.year,
              rating: 0,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col justify-center py-2">
        <p className="mb-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.35em] text-white/50">
          <span className="h-px w-8 bg-white/25" />
          Your Selection
        </p>

        <h2 className="text-3xl font-extralight tracking-tight text-white md:text-4xl">
          {movie.title}
        </h2>

        <p className="mt-3 text-sm font-light text-white/50">
          {movie.genre}
          {movie.year ? (
            <>
              <span className="mx-2 inline-block h-1 w-1 rounded-full bg-white/30 align-middle" />
              {movie.year}
            </>
          ) : null}
        </p>

        <div className="mt-8 max-w-2xl border-t border-white/8 pt-6">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
            Synopsis
          </p>
          <p className="text-sm font-light leading-relaxed text-white/40">
            The full synopsis will surface here once Spin lands a title.
          </p>
        </div>
      </div>
    </section>
  );
}
