import Link from "next/link";

const IMG = "https://image.tmdb.org/t/p/w342";

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
};

type Props = {
  movies: Movie[];
};

export default function SimilarMovies({ movies }: Props) {
  if (!movies.length) return null;


  return (
    <section className="mt-20 border-t border-white/8 pt-16">
<div className="mb-8 flex items-end justify-between">
  <div>
    <p className="text-xs uppercase tracking-[0.35em] text-white/40">
      DISCOVER MORE
    </p>

    <h2 className="mt-2 text-3xl font-light text-white">
      Similar Movies
    </h2>
  </div>
</div>
      <h2 className="mb-6 text-2xl font-light">
        You May Also Like
      </h2>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {movies.slice(0, 10).map((movie) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            className="group"
          >
            <img
              src={
                movie.poster_path
                  ? IMG + movie.poster_path
                  : "https://placehold.co/342x513/111111/666666?text=No+Poster"
              }
              alt={movie.title}
              className="aspect-[2/3] w-full rounded-2xl object-cover transition duration-300 group-hover:scale-[1.03]"
            />

            <h3 className="mt-3 truncate text-sm font-medium">
              {movie.title}
            </h3>

            <div className="mt-1 flex items-center justify-between text-xs text-white/50">
              <span>
                {(movie.release_date || "").slice(0, 4)}
              </span>

              <span>
                ⭐ {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
