"use client";

import SectionHead from "@/components/browse/SectionHead";
import type { Movie } from "@/components/movies/MovieCard";

/**
 * "This Week on Oriel" — a cinematic horizontal composition, not a carousel.
 * Five posters flow small → stronger → strongest → stronger → small: the
 * centre poster is the featured piece (larger, raised, brighter), the edges
 * recede into the dark. Each poster carries its own restrained metadata in
 * the lower portion; nothing else competes with the artwork.
 */
const SPREAD = [
  {
    size: "w-[104px] md:w-40",
    dim: "opacity-75",
    offset: "md:translate-y-8",
    featured: false,
  },
  {
    size: "w-[126px] md:w-52",
    dim: "opacity-90",
    offset: "md:translate-y-3",
    featured: false,
  },
  {
    size: "w-[150px] md:w-64",
    dim: "opacity-100",
    offset: "md:-translate-y-5",
    featured: true,
  },
  {
    size: "w-[126px] md:w-52",
    dim: "opacity-90",
    offset: "md:translate-y-3",
    featured: false,
  },
  {
    size: "w-[104px] md:w-40",
    dim: "opacity-75",
    offset: "md:translate-y-8",
    featured: false,
  },
];

type Props = {
  movies: Movie[];
};

export default function ThisWeekSection({ movies }: Props) {
  const posters = movies.slice(0, SPREAD.length);

  return (
    <section className="pt-24 md:pt-32">
      <SectionHead
        eyebrow="03 · Right now on Oriel"
        title="This Week on Oriel"
        sub="The week's strongest titles, arranged as an editorial spread — the centre is the piece in focus."
      />

      <div className="relative overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex min-w-[640px] items-end justify-center gap-3 md:min-w-0 md:gap-6">
          {posters.map((movie, i) => {
            const spec = SPREAD[i];
            return (
              <div
                key={movie.id}
                className={`relative flex flex-col items-center ${spec.offset} ${spec.dim} transition-opacity duration-500 hover:opacity-100`}
              >
                <div
                  className={`group relative overflow-hidden rounded-xl bg-[#0d0d0d] shadow-[0_26px_60px_rgba(0,0,0,0.75)] transition-transform duration-500 hover:-translate-y-2 ${spec.size} ${
                    spec.featured
                      ? "border border-white/20"
                      : "border border-white/10"
                  }`}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-2.5 pt-12">
                    <p
                      className={`truncate font-serif tracking-tight text-[#f3f0e9] ${
                        spec.featured
                          ? "text-base md:text-lg"
                          : "text-sm"
                      }`}
                    >
                      {movie.title}
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/50">
                      {[movie.year, movie.rating != null && movie.rating.toFixed(1)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
