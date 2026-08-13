// Oriel Movie Data Engine — normalization.
//
// Transforms TMDB detail/summary responses into the Oriel database model.
// The focus is data-type safety: malformed or missing fields are coerced to
// safe values instead of throwing, and a validation pass upstream decides
// whether the normalized record is actually worth persisting.

import type {
  MovieNormalizationResult,
  OrielMovieRecord,
  TmdbMovieDetail,
  TmdbGenre,
} from "./types";

/** Max characters kept for long free-text fields. */
const OVERVIEW_MAX = 2000;
const TITLE_MAX = 300;
const POSTER_MAX = 255;
const BACKDROP_MAX = 255;

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

function cleanGenres(detail: TmdbMovieDetail): {
  ids: number[];
  names: string[];
} {
  const ids: number[] = [];
  const names: string[] = [];

  // Detail responses carry { id, name } objects.
  if (Array.isArray(detail.genres)) {
    for (const genre of detail.genres as unknown[]) {
      const g = genre as Partial<TmdbGenre>;

      if (typeof g?.id === "number" && Number.isFinite(g.id)) {
        ids.push(Math.trunc(g.id));
      }

      const name = cleanString(g?.name, 80);
      if (name) names.push(name);
    }
  }

  // List responses carry genre_ids only.
  if (ids.length === 0 && Array.isArray(detail.genre_ids)) {
    for (const id of detail.genre_ids) {
      if (typeof id === "number" && Number.isFinite(id)) {
        ids.push(Math.trunc(id));
      }
    }
  }

  return { ids, names };
}

function cleanOriginCountries(detail: TmdbMovieDetail): string[] {
  const countries: string[] = [];

  if (Array.isArray(detail.production_countries)) {
    for (const c of detail.production_countries as unknown[]) {
      const item = c as { iso_3166_1?: string };

      const code = cleanString(item?.iso_3166_1, 4);
      if (code) countries.push(code);
    }
  }

  if (countries.length === 0 && Array.isArray(detail.origin_country)) {
    for (const codeRaw of detail.origin_country) {
      const code = cleanString(codeRaw, 4);
      if (code) countries.push(code);
    }
  }

  return countries.slice(0, 20);
}

/**
 * Normalizes a TMDB movie detail response into an OrielMovieRecord.
 *
 * Never throws. Malformed input yields `ok: false` with a stable `tmdbId`
 * so the caller can report/deduplicate failures.
 */
export function normalizeMovieDetail(
  raw: unknown
): MovieNormalizationResult<OrielMovieRecord> {
  const detail = raw as Partial<TmdbMovieDetail>;

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
      errors: ["TMDB movie is missing a valid numeric id"],
    };
  }

  const genres = cleanGenres(detail as TmdbMovieDetail);
  const originCountries = cleanOriginCountries(
    detail as TmdbMovieDetail
  );

  const record: OrielMovieRecord = {
    tmdb_id: tmdbId,
    title: cleanString(detail.title, TITLE_MAX) ?? "",
    original_title: cleanString(detail.original_title, TITLE_MAX),
    overview: cleanString(detail.overview, OVERVIEW_MAX),
    poster_path: cleanString(detail.poster_path, POSTER_MAX),
    backdrop_path: cleanString(detail.backdrop_path, BACKDROP_MAX),
    release_date: cleanDate(detail.release_date),
    vote_average: clampToRange(
      cleanNumber(detail.vote_average),
      0,
      10
    ),
    vote_count: cleanNumber(detail.vote_count),
    popularity: clampToRange(cleanNumber(detail.popularity), 0, null),
    genre_ids: genres.ids,
    genres: genres.names,
    original_language: cleanString(detail.original_language, 10),
    adult:
      typeof detail.adult === "boolean"
        ? detail.adult
        : false,
    video:
      typeof detail.video === "boolean"
        ? detail.video
        : false,
    runtime:
      typeof detail.runtime === "number" && Number.isFinite(detail.runtime)
        ? Math.trunc(detail.runtime)
        : null,
    origin_countries: originCountries,
    status: cleanString(detail.status, 30),
  };

  return { ok: true, value: record, errors: [], tmdbId };
}