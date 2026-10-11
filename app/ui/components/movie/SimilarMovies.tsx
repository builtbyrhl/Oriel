import Link from "next/link";
import { Star } from "lucide-react";

const IMG = "https://image.tmdb.org/t/p/w342";

type SimilarItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
};

type Props = {
  movies: SimilarItem[];
  contentType?: "movie" | "tv";
};

export default function SimilarMovies({
  movies,
  contentType = "movie",
}: Props) {
  if (!movies.length) return null;

  const href = (id: number) =>
    contentType === "tv" ? `/tv/${id}` : `/movie/${id}`;

  return (
    <section className="mt-20 border-t border-white/8 pt-16">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          DISCOVER MORE
        </p>
        <h2 className="mt-2 text-3xl font-light text-white">
          {contentType === "tv" ? "More Like This" : "Similar Movies"}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {movies.slice(0, 10).map((movie) => {
          const title = movie.title ?? movie.name ?? "Untitled";
          const year = (movie.release_date ?? movie.first_air_date ?? "")
            .slice(0, 4);

          return (
            <Link key={movie.id} href={href(movie.id)} className="group">
              <img
                src={
                  movie.poster_path
                    ? IMG + movie.poster_path
                    : "https://placehold.co/342x513/111111/666666?text=No+Poster"
                }
                alt={title}
                className="aspect-[2/3] w-full rounded-2xl object-cover transition duration-300 group-hover:scale-[1.03]"
              />

              <h3 className="mt-3 truncate text-sm font-medium">{title}</h3>

              <div className="mt-1 flex items-center justify-between text-xs text-white/50">
                <span>{year}</span>
                <span className="inline-flex items-center gap-1">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  {movie.vote_average.toFixed(1)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
