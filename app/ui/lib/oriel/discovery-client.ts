// Oriel Discovery API — client mapping.
//
// THE single seam between the Browse/Explore UI and the Phase 7 discovery
// API (`/api/oriel/discovery`). Every backend wire shape lives here; if the
// API response evolves, only this file changes — the UI components stay
// untouched. No curation/scoring/AI code lives in here.

import type { Movie } from "@/components/movies/MovieCard";

export type DiscoveryMediaScope = "movie" | "tv" | "both";

export interface DiscoveryQuery {
  genre?: string;
  mood?: string;
  mediaType?: DiscoveryMediaScope;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Wire types (mirror of the API response — owned by this module)
// ---------------------------------------------------------------------------

export interface DiscoveryApiCandidateDto {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  genres: string[];
  posterPath: string | null;
  backdropPath: string | null;
}

export interface DiscoveryApiScoreDto {
  total: number;
  signals: Record<string, number>;
}

export interface DiscoveryApiResultDto {
  candidate: DiscoveryApiCandidateDto;
  score: DiscoveryApiScoreDto;
}

export interface DiscoveryApiSuccessDto {
  ok: true;
  request: {
    genre: string | null;
    mood: string | null;
    mediaType: "movie" | "tv" | null;
    limit: number;
  };
  count: number;
  results: DiscoveryApiResultDto[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w780";

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

/** Builds the TMDB image URL for a stored relative path. */
export function discoveryImageUrl(path: string | null | undefined): string {
  if (!path) return PLACEHOLDER_IMAGE;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function toMovie(candidate: DiscoveryApiCandidateDto): Movie {
  return {
    id: candidate.tmdbId,
    title: candidate.title,
    genre: candidate.genres?.[0] ?? (candidate.mediaType === "tv" ? "Series" : "Movie"),
    year: (candidate.releaseDate ?? "").slice(0, 4),
    image: discoveryImageUrl(candidate.posterPath ?? candidate.backdropPath),
    contentType: candidate.mediaType === "tv" ? "series" : "movie",
    rating: candidate.voteAverage,
    genres: candidate.genres ?? [],
  };
}

/**
 * Maps a raw discovery API payload into the UI `Movie[]` shape. Defensively
 * tolerates unexpected payloads (e.g. an error body) by returning an empty
 * list rather than throwing, so a backend change degrades to an empty state,
 * never a crash.
 */
export function mapDiscoveryResponse(payload: unknown): Movie[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { ok?: unknown }).ok !== true
  ) {
    return [];
  }

  const body = payload as DiscoveryApiSuccessDto;
  const results = Array.isArray(body.results) ? body.results : [];

  return results
    .map((result) => result?.candidate)
    .filter((candidate): candidate is DiscoveryApiCandidateDto => Boolean(candidate))
    .map(toMovie);
}

/**
 * Fetches curated titles from the Oriel discovery API and maps them to the
 * UI shape. Throws on a non-2xx response; the caller owns error state.
 */
export async function fetchDiscovery(
  query: DiscoveryQuery,
  fetcher: typeof fetch = globalThis.fetch
): Promise<Movie[]> {
  const params = new URLSearchParams();

  if (query.genre) params.set("genre", query.genre);
  if (query.mood) params.set("mood", query.mood);
  if (query.mediaType && query.mediaType !== "both") {
    params.set("mediaType", query.mediaType);
  }
  if (query.limit) params.set("limit", String(query.limit));

  const search = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetcher(`/api/oriel/discovery${search}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Discovery request failed: ${res.status}`);
  }

  const payload: unknown = await res.json();

  return mapDiscoveryResponse(payload);
}
