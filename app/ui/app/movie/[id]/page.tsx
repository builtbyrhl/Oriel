import Link from "next/link";
import ContinueWatchingTracker from "@/components/continue-watching/ContinueWatchingTracker";
import WatchlistButton from "@/components/watchlist/WatchlistButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p/original";
const POSTER = "https://image.tmdb.org/t/p/w500";

async function getMovie(id: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${API}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load movie.");
  }

  return res.json();
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  const movie = await getMovie(id);

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      <ContinueWatchingTracker movie={movie} />

      <div className="relative h-[70vh]">

        <img
          src={`${IMG}${movie.backdrop_path}`}
          alt={movie.title}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/50 to-black/20" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end justify-between px-6 pb-16">

          <div>

            <Link
              href="/browse"
              className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-5 py-2 backdrop-blur-xl transition hover:bg-white/20"
            >
              ← Back
            </Link>

            <h1 className="text-5xl font-light md:text-7xl">
              {movie.title}
            </h1>

            <p className="mt-4 max-w-2xl text-white/70">
              {movie.overview}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/70">
              <span>⭐ {movie.vote_average.toFixed(1)}</span>
              <span>{movie.release_date}</span>
              <span>{movie.runtime} min</span>
            </div>

          </div>

          <WatchlistButton
            movie={{
              id: movie.id,
              title: movie.title,
              poster: movie.poster_path
                ? POSTER + movie.poster_path
                : "",
              backdrop: movie.backdrop_path
                ? IMG + movie.backdrop_path
                : "",
              year: (movie.release_date || "").slice(0, 4),
              rating: movie.vote_average,
            }}
          />

        </div>

      </div>

    </main>
  );
}
