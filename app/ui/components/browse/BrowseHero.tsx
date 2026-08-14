"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Movie } from "@/components/movies/MovieCard";
import WatchlistButton from "@/components/watchlist/WatchlistButton";

const BACKDROP_ORIGINAL = "https://image.tmdb.org/t/p/original";

type Props = {
  movie: Movie;
  type: "movie" | "series";
};

/**
 * The Browse-page hero — a full-bleed cinematic backdrop with editorial
 * content anchored toward the lower-left. The artwork does the visual work:
 * the only treatments are left-to-right darkening for text readability, a
 * bottom fade into the page background, and a subtle top protection for the
 * floating nav. Uses the shared trending data flow (no extra fetching);
 * the original-resolution backdrop is served from the raw path the mapping
 * keeps, falling back to the composed image.
 */
export default function BrowseHero({ movie, type }: Props) {
  const href = type === "series" ? `/tv/${movie.id}` : `/movie/${movie.id}`;
  const backdrop = movie.backdrop
    ? `${BACKDROP_ORIGINAL}${movie.backdrop}`
    : movie.image;

  const year = movie.year?.trim() || null;
  const rating = movie.rating != null ? movie.rating.toFixed(1) : null;
  const metadata = [movie.genre, year, rating].filter(
    (item): item is string => Boolean(item)
  );

  return (
    <section
      aria-label={`Featured on Oriel: ${movie.title}`}
      className="relative isolate min-h-[600px] overflow-hidden bg-[#050505] sm:min-h-[680px] lg:min-h-[760px]"
    >
      {/* Backdrop */}
      <div className="absolute inset-0">
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Left-to-right darkening for text readability */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent"
      />

      {/* Bottom fade into the page background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/15 to-transparent"
      />

      {/* Subtle top protection for the floating nav */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/35 to-transparent"
      />

      {/* Content — anchored lower-left, aligned with the page gutter */}
      <div className="relative z-10 flex min-h-[600px] items-end sm:min-h-[680px] lg:min-h-[760px]">
        <div className="mx-auto w-full max-w-7xl px-5 pb-14 md:px-6 md:pb-20">
          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
            Featured on Oriel
          </p>

          <h1 className="max-w-3xl font-serif text-5xl font-normal leading-[1.02] tracking-tight text-[#f3f0e9] md:text-7xl lg:text-8xl">
            {movie.title}
          </h1>

          {metadata.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/65">
              {metadata.map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center">
                  {index > 0 && (
                    <span aria-hidden="true" className="mr-3 text-white/25">
                      •
                    </span>
                  )}
                  {item}
                </span>
              ))}
            </div>
          )}

          {movie.overview && (
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
              {movie.overview}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={href}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              Explore
            </Link>

            <WatchlistButton
              movie={{
                id: movie.id,
                title: movie.title,
                poster: movie.image,
                backdrop: movie.image,
                year: movie.year,
                rating: movie.rating ?? 0,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
