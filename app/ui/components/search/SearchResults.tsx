import Link from "next/link";

const IMG = "https://image.tmdb.org/t/p/w185";

type SearchItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  known_for_department?: string;
};

type Props = {
  loading: boolean;
  results?: SearchItem[];
};

export default function SearchResults({
  loading,
  results = [],
}: Props) {
  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        {[1,2,3].map((i)=>(
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/10"/>
        ))}
      </div>
    );
  }

  const movies = results.filter(r=>r.media_type==="movie").slice(0,5);
  const tv = results.filter(r=>r.media_type==="tv").slice(0,5);
  const people = results.filter(r=>r.media_type==="person").slice(0,5);

  function Card(item: SearchItem, href: string) {
    const image =
      item.poster_path || item.profile_path
        ? IMG + (item.poster_path || item.profile_path)
        : "https://placehold.co/80x120/111111/666666?text=%E2%80%94";

    const year =
      item.release_date?.slice(0,4) ||
      item.first_air_date?.slice(0,4) ||
      "";

    return (
      <Link
        key={item.id}
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 active:scale-[0.98]"
      >
        <img
          src={image}
          alt={item.title || item.name || ""}
          className="h-20 w-14 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">
            {item.title || item.name}
          </p>

          {item.media_type === "person" ? (
            <p className="mt-1 text-xs text-white/50">
              {item.known_for_department || "Actor"}
            </p>
          ) : (
            <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
              {year && <span>{year}</span>}
              {item.vote_average ? (
                <span>⭐ {item.vote_average.toFixed(1)}</span>
              ) : null}
            </div>
          )}
        </div>
      </Link>
    );
  }

  const Section = ({
    title,
    items,
    route,
  }: {
    title:string;
    items:SearchItem[];
    route:(id:number)=>string;
  }) => (
    <section>
      <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">
        {title}
      </h3>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/40">
            No results
          </div>
        ) : (
          items.map(item => Card(item, route(item.id)))
        )}
      </div>
    </section>
  );

  return (
    <div className="mt-6 space-y-8">
      <Section title="Movies" items={movies} route={(id)=>`/movie/${id}`} />
      <Section title="TV Shows" items={tv} route={(id)=>`/tv/${id}`} />
      <Section title="People" items={people} route={(id)=>`/person/${id}`} />
    </div>
  );
}
