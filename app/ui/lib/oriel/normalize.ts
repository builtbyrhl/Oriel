// Oriel Media Data Engine — normalization.
//
// Transforms TMDB detail/summary responses into the Oriel database model.
// Movies and TV series share one record shape (public.oriel_movies) and differ
// only in which TMDB fields feed it; movie- and TV-specific fields are coerced
// safely so a malformed or missing value can never crash the pipeline.
// The focus is data-type safety: malformed or missing fields are coerced to
// safe values instead of throwing, and a validation pass upstream decides
// whether the normalized record is actually worth persisting.

import type {
  MediaType,
  NormalizationResult,
  OrielMediaRecord,
  TmdbGenre,
} from "./types";

/** Max characters kept for long free-text fields. */
const OVERVIEW_MAX = 2000;
const TITLE_MAX = 300;
const POSTER_MAX = 255;
const BACKDROP_MAX = 255;
const MAX_LIST_ITEMS = 20;

function cleanString(
  value: unknown,
  maxLength?: number
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function cleanInteger(value: unknown): number | null {
  const n = cleanNumber(value);
  return n === null ? null : Math.trunc(n);
}

function clampToRange(
  value: number | null,
  min: number,
  max: number | null
): number | null {
  if (value === null) return null;
  const floored = Math.max(min, value);
  return max === null ? floored : Math.min(max, floored);
}

function cleanDate(value: unknown): string | null {
  const raw = cleanString(value, 10);

  if (!raw) return null;

  // Full ISO date (YYYY-MM-DD) passes through.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Year-month "YYYY-MM" becomes the first day of that month.
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;

  // Year-only "YYYY" becomes the first day of that year.
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;

  return null;
}

function cleanGenres(
  genres: unknown,
  genreIds: unknown
): { ids: number[]; names: string[] } {
  const ids: number[] = [];
  const names: string[] = [];

  // Detail responses carry { id, name } objects.
  if (Array.isArray(genres)) {
    for (const genre of genres as unknown[]) {
      const g = genre as Partial<TmdbGenre>;

      if (typeof g?.id === "number" && Number.isFinite(g.id)) {
        ids.push(Math.trunc(g.id));
      }

      const name = cleanString(g?.name, 80);
      if (name) names.push(name);
    }
  }

  // List responses carry genre_ids only.
  if (ids.length === 0 && Array.isArray(genreIds)) {
    for (const id of genreIds) {
      if (typeof id === "number" && Number.isFinite(id)) {
        ids.push(Math.trunc(id));
      }
    }
  }

  return { ids, names };
}

function cleanOriginCountries(
  productionCountries: unknown,
  originCountry: unknown
): string[] {
  const countries: string[] = [];

  if (Array.isArray(productionCountries)) {
    for (const c of productionCountries as unknown[]) {
      const item = c as { iso_3166_1?: string };

      const code = cleanString(item?.iso_3166_1, 4);
      if (code) countries.push(code);
    }
  }

  if (countries.length === 0 && Array.isArray(originCountry)) {
    for (const codeRaw of originCountry) {
      const code = cleanString(codeRaw, 4);
      if (code) countries.push(code);
    }
  }

  return countries.slice(0, MAX_LIST_ITEMS);
}

function cleanNetworkNames(value: unknown): string[] {
  const names: string[] = [];

  if (Array.isArray(value)) {
    for (const item of value as unknown[]) {
      const name = cleanString((item as { name?: unknown })?.name, 80);
      if (name) names.push(name);
    }
  }

  return names.slice(0, MAX_LIST_ITEMS);
}

function firstEpisodeRuntime(value: unknown): number | null {
  if (!Array.isArray(value)) return null;

  for (const item of value) {
    const n = cleanNumber(item);
    if (n !== null) return n;
  }

  return null;
}

/**
 * Fields the normalizer reads off a TMDB payload. Loosely typed on purpose:
 * both movie and TV responses are coerced through the same shape so any
 * missing/mis-typed field degrades to a safe default.
 */
interface NormalizeSource {
  id?: unknown;
  title?: unknown;
  original_title?: unknown;
  name?: unknown;
  original_name?: unknown;
  overview?: unknown;
  poster_path?: unknown;
  backdrop_path?: unknown;
  release_date?: unknown;
  first_air_date?: unknown;
  last_air_date?: unknown;
  vote_average?: unknown;
  vote_count?: unknown;
  popularity?: unknown;
  genres?: unknown;
  genre_ids?: unknown;
  original_language?: unknown;
  adult?: unknown;
  video?: unknown;
  runtime?: unknown;
  episode_run_time?: unknown;
  production_countries?: unknown;
  origin_country?: unknown;
  status?: unknown;
  number_of_episodes?: unknown;
  number_of_seasons?: unknown;
  in_production?: unknown;
  networks?: unknown;
}

/**
 * Normalizes a TMDB payload into an OrielMediaRecord for the given media type.
 *
 * Never throws. Malformed input yields `ok: false` with a stable `tmdbId`
 * so the caller can report/deduplicate failures.
 */
function buildRecord(
  raw: unknown,
  mediaType: MediaType
): NormalizationResult<OrielMediaRecord> {
  const detail = raw as NormalizeSource;

  if (!detail || typeof detail !== "object") {
    return { ok: false, errors: ["TMDB response was not an object"] };
  }

  const tmdbId =
    typeof detail.id === "number" && Number.isFinite(detail.id)
      ? Math.trunc(detail.id)
      : undefined;

  if (tmdbId === undefined) {
    return {
      ok: false,
      errors: [`TMDB ${mediaType} is missing a valid numeric id`],
    };
  }

  const isTv = mediaType === "tv";
  const genres = cleanGenres(detail.genres, detail.genre_ids);
  const originCountries = cleanOriginCountries(
    detail.production_countries,
    detail.origin_country
  );
  const runtime = isTv
    ? firstEpisodeRuntime(detail.episode_run_time)
    : detail.runtime;

  const record: OrielMediaRecord = {
    media_type: mediaType,
    tmdb_id: tmdbId,
    title: cleanString(isTv ? detail.name : detail.title, TITLE_MAX) ?? "",
    original_title: cleanString(
      isTv ? detail.original_name : detail.original_title,
      TITLE_MAX
    ),
    overview: cleanString(detail.overview, OVERVIEW_MAX),
    poster_path: cleanString(detail.poster_path, POSTER_MAX),
    backdrop_path: cleanString(detail.backdrop_path, BACKDROP_MAX),
    release_date: cleanDate(isTv ? detail.first_air_date : detail.release_date),
    vote_average: clampToRange(cleanNumber(detail.vote_average), 0, 10),
    vote_count: cleanNumber(detail.vote_count),
    popularity: clampToRange(cleanNumber(detail.popularity), 0, null),
    genre_ids: genres.ids,
    genres: genres.names,
    original_language: cleanString(detail.original_language, 10),
    adult: isTv ? false : typeof detail.adult === "boolean" ? detail.adult : false,
    video: isTv ? false : typeof detail.video === "boolean" ? detail.video : false,
    runtime:
      typeof runtime === "number" && Number.isFinite(runtime)
        ? Math.trunc(runtime)
        : null,
    origin_countries: originCountries,
    status: cleanString(detail.status, 30),
    number_of_episodes: isTv ? cleanInteger(detail.number_of_episodes) : null,
    number_of_seasons: isTv ? cleanInteger(detail.number_of_seasons) : null,
    last_air_date: isTv ? cleanDate(detail.last_air_date) : null,
    in_production: isTv
      ? typeof detail.in_production === "boolean"
        ? detail.in_production
        : false
      : false,
    networks: isTv ? cleanNetworkNames(detail.networks) : [],
  };

  return { ok: true, value: record, errors: [], tmdbId };
}

/** Normalizes a TMDB movie detail response into an OrielMediaRecord. */
export function normalizeMovieDetail(
  raw: unknown
): NormalizationResult<OrielMediaRecord> {
  return buildRecord(raw, "movie");
}

/** Normalizes a TMDB TV detail response into an OrielMediaRecord. */
export function normalizeTvDetail(
  raw: unknown
): NormalizationResult<OrielMediaRecord> {
  return buildRecord(raw, "tv");
}
