// Oriel Media Data Engine — ingestion pipeline and production gateways.
//
// The engine is dependency-injected so it can be exercised with mock TMDB and
// Supabase clients in unit tests, and wired to real clients in production.
//
// Pipeline (per discovered candidate):
//   TMDB detail → normalize → validate → upsert into Supabase (on media_type + tmdb_id)
//
// Guarantees:
//   * idempotent — running twice never duplicates rows (upsert on media_type,tmdb_id)
//   * failure-isolated — one bad record never aborts the batch
//   * reusable — supports multiple discovery sources and both media types
//   * incremental — with `skipExisting`, already-ingested candidates are
//     skipped before any detail fetch, so catalogue expansion re-runs cheaply
//
// Movies and TV series are ingested through the same pipeline; `mediaType`
// selects which TMDB endpoints and normalizers to use.

import {
  discoverMovies,
  discoverTvShows,
  getMovieDetails,
  getTvDetails,
} from "../tmdb";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
} from "../movies";
import { getTrendingTv, getPopularTv, getTopRatedTv } from "../tv";
import { getServerSupabaseClient } from "../supabase/server";
import { normalizeMovieDetail, normalizeTvDetail } from "./normalize";
import { validateMediaRecord } from "./validate";
import type {
  DiscoverySource,
  IngestionSummary,
  MediaType,
  MovieDbGateway,
  OrielMediaRecord,
  TmdbGateway,
  TmdbListResult,
  TmdbMovieDetail,
  TmdbTvDetail,
  UpsertOutcome,
} from "./types";

export const MOVIES_TABLE = "oriel_movies";
export const MEDIA_ID_CONFLICT = "media_type,tmdb_id";
export const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_CONCURRENCY = 4;

// ---------------------------------------------------------------------------
// Production gateways
// ---------------------------------------------------------------------------

/** TMDB gateway backed by the existing lib/tmdb.ts, lib/movies.ts and lib/tv.ts clients. */
export const tmdbHttpGateway: TmdbGateway = {
  async discoverCandidates(
    source: DiscoverySource,
    options?: {
      mediaType?: MediaType;
      page?: number;
      genreId?: number;
      minVoteCount?: number;
      year?: number;
    }
  ): Promise<TmdbListResult> {
    const mediaType = options?.mediaType ?? "movie";

    if (mediaType === "tv") {
      if (source === "discover") {
        const data = await discoverTvShows({
          page: options?.page ?? 1,
          genre_id: options?.genreId,
          min_vote_count: options?.minVoteCount,
          first_air_date_year: options?.year,
          sort_by: "popularity.desc",
        });

        return data as TmdbListResult;
      }

      let results: unknown[];

      if (source === "popular") {
        results = await getPopularTv();
      } else if (source === "top_rated") {
        results = await getTopRatedTv();
      } else {
        results = await getTrendingTv();
      }

      return { results } as TmdbListResult;
    }

    if (source === "discover") {
      const data = await discoverMovies({
        page: options?.page ?? 1,
        genre_id: options?.genreId,
        min_vote_count: options?.minVoteCount,
        primary_release_year: options?.year,
        sort_by: "popularity.desc",
      });

      return data as TmdbListResult;
    }

    // trending / popular / top_rated reuse the existing lib/movies helpers,
    // which already own the TMDB credential handling.
    let results: unknown[];

    if (source === "popular") {
      results = await getPopularMovies();
    } else if (source === "top_rated") {
      results = await getTopRatedMovies();
    } else {
      results = await getTrendingMovies();
    }

    return { results } as TmdbListResult;
  },

  fetchDetail: async (
    tmdbId: number,
    mediaType: MediaType
  ): Promise<TmdbMovieDetail | TmdbTvDetail | null> => {
    const detail =
      mediaType === "tv"
        ? await getTvDetails(tmdbId)
        : await getMovieDetails(tmdbId);

    if (!detail || typeof detail !== "object") return null;

    return detail as TmdbMovieDetail | TmdbTvDetail;
  },
};

/**
 * Supabase media-table gateway backed by the server (service-role) client.
 * Whether to reach the fetch-derived summary endpoints at all is handled by
 * the caller; here we only need detail resolution, which works for every
 * source because discovery returns TMDB ids.
 */
export const supabaseMovieDbGateway: MovieDbGateway = {
  async existingTmdbIds(
    ids: number[],
    mediaType: MediaType
  ): Promise<Set<number>> {
    if (ids.length === 0) return new Set();

    const unique = Array.from(new Set(ids));

    const { data, error } = await getServerSupabaseClient()
      .from(MOVIES_TABLE)
      .select("tmdb_id")
      .eq("media_type", mediaType)
      .in("tmdb_id", unique);

    if (error) {
      throw new Error(`Unable to check existing media: ${error.message}`);
    }

    return new Set(
      (data as Array<{ tmdb_id: number }> | null)?.map((row) => row.tmdb_id) ??
        []
    );
  },

  async upsertMovies(records: OrielMediaRecord[]): Promise<UpsertOutcome> {
    if (records.length === 0) {
      return { inserted: 0, updated: 0, matched: records.length, error: null };
    }

    // Ask which records already exist to produce accurate inserted/updated
    // counts for reporting. Existence is scoped per (media_type, tmdb_id).
    const existing = new Set<string>();

    try {
      const byType = new Map<MediaType, number[]>();

      for (const record of records) {
        const ids = byType.get(record.media_type) ?? [];
        ids.push(record.tmdb_id);
        byType.set(record.media_type, ids);
      }

      for (const [mediaType, ids] of byType) {
        const found = await this.existingTmdbIds(ids, mediaType);
        for (const id of found) existing.add(`${mediaType}:${id}`);
      }
    } catch (err) {
      return {
        inserted: 0,
        updated: 0,
        matched: 0,
        error: err instanceof Error ? err.message : "failed to query existing rows",
      };
    }

    const { error } = await getServerSupabaseClient()
      .from(MOVIES_TABLE)
      .upsert(records, {
        onConflict: MEDIA_ID_CONFLICT,
        ignoreDuplicates: false,
      });

    if (error) {
      return {
        inserted: 0,
        updated: 0,
        matched: 0,
        error: `Supabase upsert failed: ${error.message}`,
      };
    }

    let inserted = 0;
    let updated = 0;

    for (const record of records) {
      if (existing.has(`${record.media_type}:${record.tmdb_id}`)) {
        updated += 1;
      } else {
        inserted += 1;
      }
    }

    return { inserted, updated, matched: records.length, error: null };
  },
};

// ---------------------------------------------------------------------------
// Ingestion engine
// ---------------------------------------------------------------------------

export interface IngestionOptions {
  source: DiscoverySource;
  mediaType?: MediaType;
  limit?: number;
  page?: number;
  genreId?: number;
  minVoteCount?: number;
  year?: number;
  /** Skip candidates that already exist in the catalogue before fetching details. */
  skipExisting?: boolean;
  concurrency?: number;
  tmdb?: TmdbGateway;
  db?: MovieDbGateway;
}

export interface IngestionDeps {
  tmdb: TmdbGateway;
  db: MovieDbGateway;
}

export function resolveIngestionDeps(
  partial?: Partial<IngestionDeps>
): IngestionDeps {
  return {
    tmdb: partial?.tmdb ?? tmdbHttpGateway,
    db: partial?.db ?? supabaseMovieDbGateway,
  };
}

/** Runs a pool of async work with bounded concurrency. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<Array<{ item: T; value: R | null; error: string | null }>> {
  const results: Array<{ item: T; value: R | null; error: string | null }> =
    [];
  const limitFinal = Math.max(1, limit);

  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;

      try {
        const value = await fn(items[current]);
        results[current] = { item: items[current], value, error: null };
      } catch (err) {
        results[current] = {
          item: items[current],
          value: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  const workers: Promise<void>[] = [];

  for (let i = 0; i < limitFinal; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results.filter(
    (result): result is {
      item: T;
      value: R | null;
      error: string | null;
    } => result !== undefined
  );
}

/**
 * Runs the ingestion pipeline for a batch of TMDB discoveries.
 *
 * @returns a structured summary suitable for logging or API responses.
 */
export async function runIngestion(
  options: IngestionOptions
): Promise<IngestionSummary> {
  const deps = resolveIngestionDeps({ tmdb: options.tmdb, db: options.db });
  const source = options.source;
  const mediaType = options.mediaType ?? "movie";
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_BATCH_SIZE, 100));
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const summary: IngestionSummary = {
    mediaType,
    source,
    requested: limit,
    discovered: 0,
    skippedExisting: 0,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skippedInvalid: 0,
    failedFetch: 0,
    failedWrite: 0,
    errors: [],
  };

  try {
    const listing = await deps.tmdb.discoverCandidates(source, {
      mediaType,
      page: options.page ?? 1,
      genreId: options.genreId,
      minVoteCount: options.minVoteCount,
      year: options.year,
    });

    let discovered =
      (listing.results ?? []).filter(
        (candidate) =>
          typeof candidate?.id === "number" &&
          Number.isFinite(candidate.id)
      ).slice(0, limit) ?? [];

    if (options.skipExisting) {
      try {
        const existing = await deps.db.existingTmdbIds(
          discovered.map((candidate) => candidate.id),
          mediaType
        );

        const kept = discovered.filter(
          (candidate) => !existing.has(candidate.id)
        );

        summary.skippedExisting = discovered.length - kept.length;
        discovered = kept;
      } catch (err) {
        summary.errors.push(
          `Existing-id check failed (continuing without skip): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    summary.discovered = discovered.length;

    const fetched = await mapLimit(
      discovered.map((candidate) => candidate.id),
      concurrency,
      async (tmdbId) => {
        const detail = await deps.tmdb.fetchDetail(tmdbId, mediaType);

        if (!detail) return null;

        const normalized =
          mediaType === "tv"
            ? normalizeTvDetail(detail)
            : normalizeMovieDetail(detail);

        if (!normalized.ok || !normalized.value) {
          return null;
        }

        const validation = validateMediaRecord(normalized.value);

        return validation.valid ? normalized.value : null;
      }
    );

    for (const outcome of fetched) {
      if (outcome.error) {
        summary.failedFetch += 1;
        summary.errors.push(`Fetch ${String(outcome.item)}: ${outcome.error}`);
        continue;
      }

      if (outcome.value === null) {
        summary.skippedInvalid += 1;
        continue;
      }

      summary.fetched += 1;

      // Upsert one record at a time so a single write failure cannot take
      // down the batch, but the db gateway is free to coalesce if desired.
      const result = await deps.db.upsertMovies([outcome.value]);

      if (result.error) {
        summary.failedWrite += 1;
        summary.errors.push(
          `Write ${outcome.value.tmdb_id}: ${result.error}`
        );
      } else {
        summary.inserted += result.inserted;
        summary.updated += result.updated;
      }
    }
  } catch (err) {
    summary.errors.push(
      `Ingestion aborted: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return summary;
}

/**
 * Convenience: validates that a TMDB media item exists and returns a
 * normalized record.
 */
export async function ingestSingleMedia(
  tmdbId: number,
  mediaType: MediaType = "movie",
  deps: Partial<IngestionDeps> = {}
): Promise<OrielMediaRecord | null> {
  const resolved = resolveIngestionDeps(deps);
  const detail = await resolved.tmdb.fetchDetail(tmdbId, mediaType);

  if (!detail) return null;

  const normalized =
    mediaType === "tv" ? normalizeTvDetail(detail) : normalizeMovieDetail(detail);

  if (!normalized.ok || !normalized.value) return null;

  const validation = validateMediaRecord(normalized.value);

  if (!validation.valid) return null;

  return normalized.value;
}

/** Backwards-compatible movie-only convenience. */
export async function ingestSingleMovie(
  tmdbId: number,
  deps: Partial<IngestionDeps> = {}
): Promise<OrielMediaRecord | null> {
  return ingestSingleMedia(tmdbId, "movie", deps);
}
