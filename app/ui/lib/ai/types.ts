// Oriel AI layer — provider-agnostic types.
//
// The enrichment engine depends only on the `AiProvider` interface, never on
// Gemini or OpenRouter directly, so a provider can be swapped via
// `createAiProvider()` without touching Oriel's core engine.

import type { MediaType, OrielMediaRecord } from "../oriel/types";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/** A structured-output request sent to an AI provider. */
export interface AiStructuredRequest {
  systemPrompt: string;
  userPrompt: string;
  /** OpenAPI-style JSON schema the model should conform to. */
  jsonSchema: Record<string, unknown>;
  temperature?: number;
}

/**
 * A provider that can produce structured JSON output.
 *
 * The provider is intentionally generic: it receives a prompt + JSON schema
 * and returns the parsed JSON as `unknown`. The caller owns validation
 * (strict schema parsing), so a provider can never smuggle arbitrary text
 * into the database.
 */
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateStructured(request: AiStructuredRequest): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Enrichment domain types
// ---------------------------------------------------------------------------

/** One validated semantic enrichment for a single media item. */
export interface SemanticEnrichmentRecord {
  media_type: MediaType;
  tmdb_id: number;
  /** Envelope schema version; bump when new fields are added. */
  version: number;
  provider: string;
  model: string;
  fields: SemanticFields;
}

/** Strict, validated semantic fields describing a movie or TV series. */
export interface SemanticFields {
  moods: string[];
  tone: string;
  pacing: "slow" | "moderate" | "fast";
  themes: string[];
  semantic_genres: string[];
  intensity: number; // 0-10 descriptive intensity, NOT a quality score
  audience_descriptors: string[];
}

/** The semantic envelope as stored in oriel_media_semantics. */
export interface SemanticEnrichmentRow extends SemanticEnrichmentRecord {
  id: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Job lifecycle
// ---------------------------------------------------------------------------

export type EnrichmentJobStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

export interface EnrichmentJobRow {
  media_type: MediaType;
  tmdb_id: number;
  status: EnrichmentJobStatus;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EnrichmentClaimReason = "ok" | "already_succeeded" | "attempts_exhausted";

export interface EnrichmentClaim {
  proceed: boolean;
  reason: EnrichmentClaimReason;
  attempt: number;
}

// ---------------------------------------------------------------------------
// Database gateway (testable via DI)
// ---------------------------------------------------------------------------

export interface EnrichmentDbGateway {
  /** Loads the normalized media record backing a job. */
  getMedia(
    mediaType: MediaType,
    tmdbId: number
  ): Promise<OrielMediaRecord | null>;

  /** Atomically claims the job for this media item (creates/retries). */
  claimEnrichment(
    mediaType: MediaType,
    tmdbId: number,
    maxAttempts: number
  ): Promise<EnrichmentClaim>;

  /** Persists validated semantics (idempotent upsert). */
  saveSemantics(record: SemanticEnrichmentRecord): Promise<void>;

  /** Records the terminal job outcome. */
  finishEnrichment(
    mediaType: MediaType,
    tmdbId: number,
    status: "succeeded" | "failed",
    error?: string
  ): Promise<void>;

  /** Returns up to `limit` media items that still need enrichment. */
  getEnrichmentQueue(
    mediaType: MediaType,
    limit: number
  ): Promise<Array<{ media_type: MediaType; tmdb_id: number }>>;

  /** Counts catalog size, successfully enriched items, and what remains. */
  getEnrichmentCoverage(
    mediaType: MediaType
  ): Promise<EnrichmentCoverage | null>;
}

// ---------------------------------------------------------------------------
// Engine results
// ---------------------------------------------------------------------------

export type EnrichMediaResult =
  | { status: "succeeded"; record: SemanticEnrichmentRecord }
  | { status: "skipped"; reason: "already_succeeded" | "attempts_exhausted" }
  | { status: "failed"; error: string };

export interface EnrichmentBatchSummary {
  mediaType: MediaType;
  requested: number;
  attempted: number;
  succeeded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/** Coverage of a media type by successful enrichment. */
export interface EnrichmentCoverage {
  mediaType: MediaType;
  /** Total media rows in the catalog for this type. */
  total: number;
  /** Rows with a succeeded enrichment job. */
  enriched: number;
  /** Rows still needing enrichment (total - enriched). */
  remaining: number;
}

// ---------------------------------------------------------------------------
// Backfill (drain) engine
// ---------------------------------------------------------------------------

/** Options for draining the enrichment queue to completion. */
export interface BackfillOptions {
  mediaType: MediaType;
  /** Per-batch queue size (default 10, clamped to [1, 100]). */
  batchSize?: number;
  /** Hard cap on items processed in one run (default 500). */
  maxItems?: number;
  provider?: AiProvider;
  db?: EnrichmentDbGateway;
  schemaVersion?: number;
  maxAttempts?: number;
  /** Invoked after each batch with that batch's summary and running totals. */
  onBatch?: (batch: EnrichmentBatchSummary, progress: BackfillProgress) => void;
}

/** Running totals across all batches of a backfill run. */
export interface BackfillProgress {
  batches: number;
  /** Items claimed from the queue so far (attempted). */
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
}

/** Aggregated result of a backfill run. */
export interface BackfillSummary extends EnrichmentBatchSummary {
  batches: number;
  maxItems: number;
  /** Why the run stopped: drained the queue, or hit the item cap. */
  stopped: "exhausted" | "cap_reached";
}
