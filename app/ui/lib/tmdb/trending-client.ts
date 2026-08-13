// TMDB trending — client mapping.
//
// The single seam between the Browse/Explore UI and `/api/tmdb/trending`.
// Hero and "This Week on Oriel" are TMDB-driven; this module owns the wire
// shape so the components stay untouched if the route ever changes. No
// curation or scoring lives in here — it is a pure consumer.

import type { Movie } from "@/components/movies/MovieCard";

export type TrendingMediaScope = "movie" | "tv";

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w780";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

/** Dark gradient fallback so a card never renders a broken image. */
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="#262626"/><stop offset="100%" stop-color="#0a0a0a"/>` +
      `</linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<circle cx="250" cy="320" r="58" fill="none" stroke="#3f3f3f" stroke-width="7"/>` +
      `<rect x="196" y="390" width="108" height="12" rx="6" fill="#3f3f3f"/>` +
      `<rect x="160" y="414" width="180" height="10" rx="5" fill="#2e2e2e"/>` +
      `</svg>`
  );

export function trendingToMovie(
  item: TrendingItem,
  mediaType: TrendingMediaScope,
  opts: { poster?: boolean } = {}
): Movie {
  const poster = opts.poster ?? false;
  const path = poster
    ? item.poster_path ?? item.backdrop_path
    : item.backdrop_path ?? item.poster_path;
  const base = poster ? POSTER_BASE : BACKDROP_BASE;

  return {
    id: item.id,
    title: item.title || item.name || "Untitled",
    genre: mediaType === "tv" ? "Series" : "Movie",
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    image: path ? `${base}${path}` : PLACEHOLDER_IMAGE,
    contentType: mediaType === "tv" ? "series" : "movie",
    rating: item.vote_average ?? null,
    overview: item.overview,
  };
}

/**
 * Maps a raw `/api/tmdb/trending` payload into the UI `Movie[]` shape.
 * Defensively tolerates unexpected payloads (an error body, an empty result
 * set) by returning an empty list rather than throwing.
 */
export function mapTrendingResponse(
  payload: unknown,
  mediaType: TrendingMediaScope,
  opts: { poster?: boolean } = {}
): Movie[] {
  if (!payload || typeof payload !== "object") return [];

  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  return results
    .map((item) => trendingToMovie(item as TrendingItem, mediaType, opts))
    .filter((movie): movie is Movie => movie.id > 0);
}

/**
 * Fetches the week's trending titles via the TMDB proxy route and maps them
 * to the UI shape. Throws on a non-2xx response; the caller owns error state.
 */
export async function fetchTrending(
  mediaType: TrendingMediaScope,
  opts: { poster?: boolean } = {},
  fetcher: typeof fetch = globalThis.fetch
): Promise<Movie[]> {
  const res = await fetcher(`/api/tmdb/trending?type=${mediaType}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Trending request failed: ${res.status}`);
  }

  const payload: unknown = await res.json();

  return mapTrendingResponse(payload, mediaType, opts);
}
