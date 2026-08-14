// Oriel Spin API — client seam.
//
// THE single bridge between the Spin mechanism UI and `/api/oriel/spin`. Every
// backend wire shape lives here; if the API response evolves, only this file
// changes. The React component never builds TMDB URLs and never knows how
// Supabase works — it consumes `SpinUiCandidate[]` (or an error) and nothing
// else. No curation/scoring/AI code lives in here.

export type SpinMediaScope = "movie" | "tv" | "both";

export interface SpinQuery {
  genre?: string;
  mood?: string;
  mediaType?: SpinMediaScope;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Wire types (mirror of the Spin API response — owned by this module)
// ---------------------------------------------------------------------------

export interface SpinApiCandidateDto {
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
  overview: string | null;
  runtime: number | null;
}

export interface SpinApiSuccessDto {
  ok: true;
  request: {
    genre: string | null;
    mood: string | null;
    mediaType: "movie" | "tv" | null;
    limit: number;
  };
  count: number;
  candidates: {
    candidate: SpinApiCandidateDto;
    score: { total: number };
  }[];
}

// ---------------------------------------------------------------------------
// UI shape
// ---------------------------------------------------------------------------

/** The shape the Spin mechanism consumes. */
export interface SpinUiCandidate {
  id: number;
  title: string;
  image: string;
  year: string | null;
  runtime: number | null;
  rating: number | null;
  genres: string[];
  overview: string | null;
  mediaType: "movie" | "tv";
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
export function spinImageUrl(path: string | null | undefined): string {
  if (!path) return PLACEHOLDER_IMAGE;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function toUiCandidate(candidate: SpinApiCandidateDto): SpinUiCandidate {
  return {
    id: candidate.tmdbId,
    title: candidate.title,
    image: spinImageUrl(candidate.posterPath ?? candidate.backdropPath),
    year: (candidate.releaseDate ?? "").slice(0, 4) || null,
    runtime: candidate.runtime,
    rating: candidate.voteAverage,
    genres: candidate.genres ?? [],
    overview: candidate.overview,
    mediaType: candidate.mediaType,
  };
}

/**
 * Maps a raw Spin API payload into the UI shape. Defensively tolerates
 * unexpected payloads (e.g. an error body) by returning an empty list rather
 * than throwing, so a backend change degrades to the empty state, never a
 * crash.
 */
export function mapSpinResponse(payload: unknown): SpinUiCandidate[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { ok?: unknown }).ok !== true
  ) {
    return [];
  }

  const body = payload as SpinApiSuccessDto;
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];

  return candidates
    .map((entry) => entry?.candidate)
    .filter((candidate): candidate is SpinApiCandidateDto => Boolean(candidate))
    .map(toUiCandidate);
}

/**
 * Fetches a Spin set from the Oriel Spin API and maps it to the UI shape.
 * Throws on a non-2xx response; the caller owns the error state.
 */
export async function fetchSpin(
  query: SpinQuery,
  fetcher: typeof fetch = globalThis.fetch
): Promise<SpinUiCandidate[]> {
  const params = new URLSearchParams();

  if (query.genre) params.set("genre", query.genre);
  if (query.mood) params.set("mood", query.mood);
  if (query.mediaType && query.mediaType !== "both") {
    params.set("mediaType", query.mediaType);
  }
  if (query.limit) params.set("limit", String(query.limit));

  const search = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetcher(`/api/oriel/spin${search}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Spin request failed: ${res.status}`);
  }

  const payload: unknown = await res.json();

  return mapSpinResponse(payload);
}
