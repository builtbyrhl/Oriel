// Oriel AI layer — enrichment engine and production database gateway.
//
// Pipeline per media item:
//   claim job (idempotent, retry-aware)
//   → load media record
//   → build prompt
//   → provider structured output
//   → strict schema validation
//   → upsert semantics + mark job succeeded   (or mark job failed)
//
// Guarantees:
//   * idempotent — a succeeded job is never re-run; semantics upsert on
//     (media_type, tmdb_id)
//   * retryable — failed jobs re-enter the queue until max_attempts, with a
//     simple backoff
//   * failure-isolated — AI failures never touch oriel_movies, so a movie
//     stays fully usable regardless of enrichment state
//   * non-selective — enrichment describes, never ranks/selects/recommends

import { MOVIES_TABLE } from "../oriel/ingest";
import type {
  MediaType,
  OrielMediaRecord,
} from "../oriel/types";
import { getServerSupabaseClient } from "../supabase/server";
import { buildEnrichmentRequest } from "./prompt";
import { parseSemanticFields } from "./schema";
import { createAiProvider } from "./providers";
import type {
  AiProvider,
  BackfillOptions,
  BackfillProgress,
  BackfillSummary,
  EnrichmentBatchSummary,
  EnrichmentClaim,
  EnrichmentCoverage,
  EnrichmentDbGateway,
  EnrichMediaResult,
  SemanticEnrichmentRecord,
} from "./types";

export const SEMANTICS_TABLE = "oriel_media_semantics";
export const JOBS_TABLE = "oriel_enrichment_jobs";
export const SEMANTICS_CONFLICT = "media_type,tmdb_id";
export const DEFAULT_MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Production database gateway
// ---------------------------------------------------------------------------

function mapMovieRowToRecord(row: Record<string, unknown>): OrielMediaRecord {
  return {
    media_type: row.media_type as MediaType,
    tmdb_id: row.tmdb_id as number,
    title: row.title as string,
    original_title: (row.original_title as string | null) ?? null,
    overview: (row.overview as string | null) ?? null,
    poster_path: (row.poster_path as string | null) ?? null,
    backdrop_path: (row.backdrop_path as string | null) ?? null,
    release_date: (row.release_date as string | null) ?? null,
    vote_average: (row.vote_average as number | null) ?? null,
    vote_count: (row.vote_count as number | null) ?? null,
    popularity: (row.popularity as number | null) ?? null,
    genre_ids: (row.genre_ids as number[]) ?? [],
    genres: (row.genres as string[]) ?? [],
    original_language: (row.original_language as string | null) ?? null,
    adult: Boolean(row.adult),
    video: Boolean(row.video),
    runtime: (row.runtime as number | null) ?? null,
    origin_countries: (row.origin_countries as string[]) ?? [],
    status: (row.status as string | null) ?? null,
    number_of_episodes: (row.number_of_episodes as number | null) ?? null,
    number_of_seasons: (row.number_of_seasons as number | null) ?? null,
    last_air_date: (row.last_air_date as string | null) ?? null,
    in_production: Boolean(row.in_production),
    networks: (row.networks as string[]) ?? [],
  };
}

/**
 * Supabase enrichment gateway backed by the server (service-role) client.
 * Job claiming/queuing use database functions for atomic, retry-safe updates.
 */
export const supabaseEnrichmentDbGateway: EnrichmentDbGateway = {
  async getMedia(mediaType, tmdbId) {
    const { data, error } = await getServerSupabaseClient()
      .from(MOVIES_TABLE)
      .select("*")
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load media: ${error.message}`);
    }

    if (!data) return null;

    return mapMovieRowToRecord(data);
  },

  async claimEnrichment(mediaType, tmdbId, maxAttempts) {
    const { data, error } = await getServerSupabaseClient()
      .rpc("oriel_claim_enrichment", {
        p_media_type: mediaType,
        p_tmdb_id: tmdbId,
        p_max_attempts: maxAttempts,
      });

    if (error) {
      throw new Error(`Unable to claim enrichment job: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { proceed: boolean; reason: EnrichmentClaim["reason"]; attempt: number }
      | undefined;

    if (!row) {
      throw new Error("Enrichment claim returned no row");
    }

    return {
      proceed: Boolean(row.proceed),
      reason: row.reason,
      attempt: row.attempt,
    };
  },

  async saveSemantics(record) {
    const { error } = await getServerSupabaseClient()
      .from(SEMANTICS_TABLE)
      .upsert(record, { onConflict: SEMANTICS_CONFLICT });

    if (error) {
      throw new Error(`Unable to save semantics: ${error.message}`);
    }
  },

  async finishEnrichment(mediaType, tmdbId, status, error) {
    const { error: err } = await getServerSupabaseClient()
      .from(JOBS_TABLE)
      .update({
        status,
        last_error: error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId);

    if (err) {
      throw new Error(`Unable to finish enrichment job: ${err.message}`);
    }
  },

  async getEnrichmentQueue(mediaType, limit) {
    const { data, error } = await getServerSupabaseClient()
      .rpc("oriel_enrichment_queue", {
        p_media_type: mediaType,
        p_limit: limit,
      });

    if (error) {
      throw new Error(`Unable to load enrichment queue: ${error.message}`);
    }

    return (data as Array<{ media_type: MediaType; tmdb_id: number }>) ?? [];
  },

  async getEnrichmentCoverage(mediaType) {
    const { data, error } = await getServerSupabaseClient().rpc(
      "oriel_enrichment_coverage",
      { p_media_type: mediaType }
    );

    if (error) {
      throw new Error(`Unable to load enrichment coverage: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { total: number; enriched: number; remaining: number }
      | undefined;

    if (!row) return null;

    return {
      mediaType,
      total: Number(row.total),
      enriched: Number(row.enriched),
      remaining: Number(row.remaining),
    };
  },
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface EnrichmentDeps {
  provider: AiProvider;
  db: EnrichmentDbGateway;
}

export function resolveEnrichmentDeps(
  partial?: Partial<EnrichmentDeps>
): EnrichmentDeps {
  return {
    provider: partial?.provider ?? createAiProvider(),
    db: partial?.db ?? supabaseEnrichmentDbGateway,
  };
}

export interface EnrichMediaOptions {
  mediaType: MediaType;
  tmdbId: number;
  provider?: AiProvider;
  db?: EnrichmentDbGateway;
  schemaVersion?: number;
  maxAttempts?: number;
}

/**
 * Enriches a single media item. Idempotent: an already-succeeded job returns
 * `skipped` without calling the AI provider.
 */
export async function enrichMedia(
  options: EnrichMediaOptions
): Promise<EnrichMediaResult> {
  const deps = resolveEnrichmentDeps({
    provider: options.provider,
    db: options.db,
  });
  const { mediaType, tmdbId } = options;
  const schemaVersion = options.schemaVersion ?? 1;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const claim = await deps.db.claimEnrichment(mediaType, tmdbId, maxAttempts);

  if (!claim.proceed) {
    return {
      status: "skipped",
      reason: claim.reason === "ok" ? "already_succeeded" : claim.reason,
    };
  }

  const media = await deps.db.getMedia(mediaType, tmdbId);

  if (!media) {
    const error = `Media ${mediaType}:${tmdbId} not found in oriel_movies`;
    await deps.db.finishEnrichment(mediaType, tmdbId, "failed", error);
    return { status: "failed", error };
  }

  try {
    const raw = await deps.provider.generateStructured(
      buildEnrichmentRequest(media)
    );

    const parsed = parseSemanticFields(raw);

    if (!parsed.ok) {
      const error = `Invalid structured output: ${parsed.errors.join("; ")}`;
      await deps.db.finishEnrichment(mediaType, tmdbId, "failed", error);
      return { status: "failed", error };
    }

    const record: SemanticEnrichmentRecord = {
      media_type: mediaType,
      tmdb_id: tmdbId,
      version: schemaVersion,
      provider: deps.provider.name,
      model: deps.provider.model,
      fields: parsed.fields,
    };

    await deps.db.saveSemantics(record);
    await deps.db.finishEnrichment(mediaType, tmdbId, "succeeded");

    return { status: "succeeded", record };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await deps.db.finishEnrichment(mediaType, tmdbId, "failed", error);
    return { status: "failed", error };
  }
}

export interface EnrichBatchOptions {
  mediaType: MediaType;
  limit?: number;
  provider?: AiProvider;
  db?: EnrichmentDbGateway;
  schemaVersion?: number;
  maxAttempts?: number;
}

/** Enriches up to `limit` queued media items and aggregates the outcome. */
export async function enrichBatch(
  options: EnrichBatchOptions
): Promise<EnrichmentBatchSummary> {
  const deps = resolveEnrichmentDeps({
    provider: options.provider,
    db: options.db,
  });
  const mediaType = options.mediaType;
  const limit = Math.max(1, Math.min(options.limit ?? 10, 100));

  const summary: EnrichmentBatchSummary = {
    mediaType,
    requested: limit,
    attempted: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const queue = await deps.db.getEnrichmentQueue(mediaType, limit);

  for (const item of queue) {
    const result = await enrichMedia({
      mediaType: item.media_type,
      tmdbId: item.tmdb_id,
      provider: deps.provider,
      db: deps.db,
      schemaVersion: options.schemaVersion,
      maxAttempts: options.maxAttempts,
    });

    summary.attempted += 1;

    if (result.status === "succeeded") {
      summary.succeeded += 1;
    } else if (result.status === "skipped") {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
      summary.errors.push(`${mediaType}:${item.tmdb_id}: ${result.error}`);
    }
  }

  return summary;
}

/**
 * Returns enrichment coverage for a media type (catalog totals + what
 * remains), or null when the catalog has no rows for that type.
 */
export async function getEnrichmentCoverage(
  mediaType: MediaType,
  db?: EnrichmentDbGateway
): Promise<EnrichmentCoverage | null> {
  const gateway = db ?? supabaseEnrichmentDbGateway;

  return gateway.getEnrichmentCoverage(mediaType);
}

/**
 * Backfills the enrichment queue for a media type to completion.
 *
 * Runs `enrichBatch` in a loop until the queue is drained (a batch claims
 * zero items) or `maxItems` have been processed. Failed jobs are recorded by
 * the job lifecycle with their backoff, so a run always terminates: exhausted
 * attempts drop out of the queue and backoff-bounded failures re-enter only
 * after `next_run_at`. Each batch is independent — one bad batch never aborts
 * the rest of the run.
 */
export async function backfillEnrichment(
  options: BackfillOptions
): Promise<BackfillSummary> {
  const deps = resolveEnrichmentDeps({
    provider: options.provider,
    db: options.db,
  });
  const { mediaType } = options;
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 10, 100));
  const maxItems = Math.max(1, Math.round(options.maxItems ?? 500));
  const schemaVersion = options.schemaVersion ?? 1;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const summary: BackfillSummary = {
    mediaType,
    requested: 0,
    attempted: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    batches: 0,
    maxItems,
    stopped: "exhausted",
  };

  while (summary.attempted < maxItems) {
    const remaining = maxItems - summary.attempted;
    const batch = await enrichBatch({
      mediaType,
      limit: Math.min(batchSize, remaining),
      provider: deps.provider,
      db: deps.db,
      schemaVersion,
      maxAttempts,
    });

    // A batch that claims nothing means the queue is drained. Treat it as a
    // probe, not a batch: don't count it, aggregate it, or report it.
    if (batch.attempted === 0) {
      summary.stopped = "exhausted";
      break;
    }

    summary.batches += 1;
    summary.attempted += batch.attempted;
    summary.succeeded += batch.succeeded;
    summary.skipped += batch.skipped;
    summary.failed += batch.failed;
    summary.errors.push(...batch.errors);

    const progress: BackfillProgress = {
      batches: summary.batches,
      processed: summary.attempted,
      succeeded: summary.succeeded,
      skipped: summary.skipped,
      failed: summary.failed,
    };

    options.onBatch?.(batch, progress);

    if (summary.attempted >= maxItems) {
      summary.stopped = "cap_reached";
      break;
    }
  }

  // `requested` in a drain context is the number of items actually pulled from
  // the queue — every queued item is attempted.
  summary.requested = summary.attempted;

  return summary;
}
