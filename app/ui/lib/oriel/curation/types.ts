// Oriel Curation Engine — discovery request and candidate pool types.
//
// A discovery request is the atomic unit of curation: a genre and/or mood
// dimension, an optional media-type scope, and a configurable result limit.
// The engine answers it with a BROAD candidate pool for later ranking — never
// final recommendations, scores, or personalization.

import type { MediaType } from "../types";
import type { SemanticFields } from "../../ai/types";

/** Which media kinds a discovery request covers. */
export type DiscoveryMediaScope = MediaType | "both";

/**
 * Loose, user-facing discovery request. Fields are optional and unvalidated;
 * the engine normalizes and validates them (see `DiscoveryResult`).
 */
export interface DiscoveryRequest {
  genre?: string;
  mood?: string;
  mediaType?: DiscoveryMediaScope;
  limit?: number;
}

/**
 * Validated, canonical request the engine hands to the data layer. Genre and
 * mood are independent dimensions; when both are present the candidate pool is
 * their intersection. `mediaType` is null for "both", so a NULL in the filter
 * means "don't filter by media type".
 */
export interface NormalizedDiscoveryRequest {
  genre: string | null;
  mood: string | null;
  mediaType: MediaType | null;
  limit: number;
}

/** Stored AI semantic envelope attached to a candidate when available. */
export interface CandidateSemantics {
  version: number;
  provider: string;
  model: string;
  fields: SemanticFields;
}

/**
 * A single unranked candidate from the discovery pool. Only media identity +
 * lightweight browse metadata is carried here; everything else (semantics for
 * ranking) rides along as `semantics` when a stored enrichment exists.
 */
export interface DiscoveryCandidate {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  genres: string[];
  /** Present only when the media item has been semantically enriched. */
  semantics: CandidateSemantics | null;
}

/** The broad, unranked pool produced for a validated discovery request. */
export interface CandidatePool {
  request: NormalizedDiscoveryRequest;
  /** Number of candidates returned (bounded by request.limit). */
  count: number;
  candidates: DiscoveryCandidate[];
}

/** Outcome of building a candidate pool. Invalid requests never reach the DB. */
export type DiscoveryResult =
  | { ok: true; pool: CandidatePool }
  | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// Data gateway (testable via DI)
// ---------------------------------------------------------------------------

/** One row returned by the discovery candidate RPC. */
export interface DiscoveryCandidateRow {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  release_date: string | null;
  vote_average: number | null;
  vote_count: number | null;
  popularity: number | null;
  genres: string[];
  version: number | null;
  provider: string | null;
  model: string | null;
  fields: unknown;
}

/** Minimal data-layer surface the discovery engine relies on. */
export interface DiscoveryDbGateway {
  fetchCandidates(options: {
    genre: string | null;
    mood: string | null;
    mediaType: MediaType | null;
    limit: number;
  }): Promise<DiscoveryCandidateRow[]>;
}
