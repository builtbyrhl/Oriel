import Link from "next/link";
import { getPerson, getPersonMovies } from "@/lib/tmdb";
import MovieCard from "@/components/movies/MovieCard";

const IMG = "https://image.tmdb.org/t/p/w780";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const person = await getPerson(id);
  const movies = await getPersonMovies(id);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">

        <Link
          href="javascript:history.back()"
          className="mb-8 inline-block rounded-full border border-white/10 bg-white/10 px-5 py-2 backdrop-blur-xl transition hover:bg-white/20"
        >
          ← Back
        </Link>

        <div className="grid gap-10 md:grid-cols-[280px_1fr]">

          <img
            src={
              person.profile_path
                ? IMG + person.profile_path
                : "https://placehold.co/400x600?text=Actor"
            }
            alt={person.name}
            className="w-full rounded-[32px] border border-white/10 object-cover"
          />

          <div>

            <h1 className="text-5xl font-light">
              {person.name}
            </h1>

            <div className="mt-6 space-y-2 text-white/70">

              <p>
                <strong className="text-white">
                  Birthday:
                </strong>{" "}
                {person.birthday || "Unknown"}
              </p>

              <p>
                <strong className="text-white">
                  Place of Birth:
                </strong>{" "}
                {person.place_of_birth || "Unknown"}
              </p>

              <p>
                <strong className="text-white">
                  Known For:
                </strong>{" "}
                {person.known_for_department}
              </p>

            </div>

            <div className="mt-10">

              <h2 className="mb-4 text-2xl font-light">
                Biography
              </h2>

              <p className="leading-8 text-white/70">
                {person.biography || "Biography unavailable."}
              </p>

            </div>

          </div>

        </div>

        <section className="mt-16">

          <div className="mb-6 flex items-center justify-between">

            <h2 className="text-3xl font-light">
              Filmography
            </h2>

            <span className="text-sm text-white/40">
              {movies.cast.length} Movies
            </span>

          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">

            {movies.cast
              .sort((a: any, b: any) => (
                (b.release_date||"").localeCompare(a.release_date||"")
              ))
              .map((movie: any) => (
                <MovieCard
                  key={movie.id}
                  movie={{
                    id: movie.id,
                    title: movie.title,
                    genre: "Movie",
                    year: (movie.release_date||"").slice(0,4),
                    image: movie.poster_path
                      ? "https://image.tmdb.org/t/p/w500"+movie.poster_path
                      : "https://placehold.co/500x750?text=Movie",
                    contentType: "movie"
                  }}
                />
              ))}

          </div>

        </section>

      </div>
    </main>
  );
}
