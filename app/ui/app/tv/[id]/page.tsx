import Link from "next/link";
import { getTv, getTvCredits } from "@/lib/tmdb";
import MovieClient from "@/components/movie/MovieClient";
import MovieActions from "@/components/movie/MovieActions";
import Synopsis from "@/components/movie/Synopsis";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const IMG =
  "https://image.tmdb.org/t/p/original";

export default async function TvPage({
  params,
}: Props) {
  const { id } = await params;

  const tv = await getTv(id);
  const credits = await getTvCredits(id);

  const title =
    tv.name || "Untitled Series";

  const year =
    (tv.first_air_date || "").slice(0, 4);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="relative h-[72vh]">
        <img
          src={
            tv.backdrop_path
              ? `${IMG}${tv.backdrop_path}`
              : "https://placehold.co/1920x1080/050505/666666?text=No+Backdrop"
          }
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/55 to-black/25" />

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end px-6 pb-16">
          <div>
            <Link
              href="/browse?type=tv"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-2xl transition-all duration-300 hover:bg-white/20 hover:border-white/30"
            >
              ← Back
            </Link>

            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
              Series
            </p>

            <h1 className="max-w-3xl text-5xl font-extralight leading-[0.95] tracking-tight md:text-7xl">
              {title}
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-xl">
                ★ {(tv.vote_average ?? 0).toFixed(1)}
              </span>

              {year && (
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-xl">
                  {year}
                </span>
              )}

              {tv.number_of_seasons ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-xl">
                  {tv.number_of_seasons}{" "}
                  {tv.number_of_seasons === 1
                    ? "Season"
                    : "Seasons"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <Synopsis
          text={
            tv.overview ||
            "Synopsis unavailable."
          }
        />

        <div className="mt-8">
          <MovieActions
            tmdbId={tv.id}
            type="tv"
            title={title}
            season={1}
            episode={1}
          />
        </div>

         <MovieClient
          movieId={tv.id}
          movieTitle={title}
          contentType="series"
          seasons={
            Array.isArray(tv?.seasons)
              ? tv.seasons
                  .filter(
                    (s: { season_number?: number; episode_count?: number }) =>
                      (s.season_number ?? 0) >= 1,
                  )
                  .map((s: { season_number: number; episode_count?: number }) => ({
                    season: s.season_number,
                    episodes: s.episode_count ?? 0,
                  }))
              : undefined
          }
          credits={credits}
        />
      </section>
    </main>
  );
}
