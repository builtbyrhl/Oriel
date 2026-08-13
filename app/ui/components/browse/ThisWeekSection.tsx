"use client";

import SectionHead from "@/components/browse/SectionHead";
import type { Movie } from "@/components/movies/MovieCard";

/**
 * "This Week on Oriel" — an editorial poster composition, not a carousel.
 * Each poster is a separate piece: varied widths, staggered vertical offsets
 * and subtle rotations create a left-to-right rhythm with deliberate negative
 * space. The surrounding UI stays restrained.
 */
const SPREAD = [
  {
    w: "w-[118px] md:w-44",
    offset: "md:-translate-y-10",
    rotate: "-rotate-2",
    gap: "md:mr-2",
  },
  {
    w: "w-[142px] md:w-60",
    offset: "md:-translate-y-2",
    rotate: "rotate-1",
    gap: "md:mr-6",
  },
  {
    w: "w-[128px] md:w-[210px]",
    offset: "md:translate-y-4",
    rotate: "-rotate-1",
    gap: "md:mr-8",
  },
  {
    w: "w-[118px] md:w-44",
    offset: "md:-translate-y-12",
    rotate: "rotate-2",
    gap: "md:mr-4",
  },
  {
    w: "w-[132px] md:w-52",
    offset: "md:-translate-y-6",
    rotate: "-rotate-1",
    gap: "",
  },
];

type Props = {
  movies: Movie[];
};

export default function ThisWeekSection({ movies }: Props) {
  const posters = movies.slice(0, SPREAD.length);

  return (
    <section className="pt-[74px]">
      <SectionHead
        eyebrow="04 · Right now on Oriel"
        title="This Week on Oriel"
        sub="The week's strongest titles, arranged as an editorial spread — every poster an individual piece."
      />

      <div className="relative overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex min-w-[640px] items-end justify-between gap-5 md:min-w-0 md:justify-center md:gap-0">
          {posters.map((movie, i) => {
            const spec = SPREAD[i];
            return (
              <div
                key={movie.id}
                className={`group relative flex flex-col items-center ${spec.offset} ${spec.gap}`}
              >
                <div
                  className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_26px_60px_rgba(0,0,0,0.75)] transition-transform duration-500 group-hover:-translate-y-2 ${spec.w}`}
                  style={{ transform: `rotate(${spec.rotate}deg)` }}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
                <p className="pointer-events-none mt-3 max-w-full truncate font-serif text-sm tracking-tight text-white/40 transition-colors duration-500 group-hover:text-white/80">
                  {movie.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
