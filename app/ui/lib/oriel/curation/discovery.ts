// Oriel Curation Engine — milestone 1: discovery request + candidate pool.
//
// `buildCandidatePool(request)` turns a loose discovery request into a broad,
// unranked candidate pool using the existing Supabase/Oriel data layer.
//
// Semantics (mirrored 1:1 by the SQL in oriel_discovery_candidates):
//   * genre  -> case-insensitive match against oriel_movies.genres
//   * mood   -> case-insensitive match against the stored AI `moods` array
//   * genre + mood -> INTERSECTION (both must match; never OR)
//   * mediaType -> 'movie' | 'tv' | null (null = both)
//
// The engine only discovers and returns candidates. Scoring, diversity
// ranking, personalization, AI calls and Spin are intentionally out of scope.

import { getServerSupabaseClient } from "../../supabase/server";
import { parseSemanticFields } from "../../ai/schema";
import type { MediaType } from "../types";
import type {
  CandidatePool,
  CandidateSemantics,
  DiscoveryCandidate,
  DiscoveryCandidateRow,
  DiscoveryDbGateway,
  DiscoveryRequest,
  DiscoveryResult,
  NormalizedDiscoveryRequest,
} from "./types";

export const DEFAULT_DISCOVERY_LIMIT = 50;
export const MAX_DISCOVERY_LIMIT = 200;

/**
 * Common genre spellings mapped to the canonical TMDB genre name stored in
 * oriel_movies.genres. Case differences are handled case-insensitively in
 * SQL; only genuinely different strings need an entry here.
 */
const GENRE_ALIASES: Record<string, string> = {
  "sci-fi": "Science Fiction",
  scifi: "Science Fiction",
  sf: "Science Fiction",
};

export function normalizeGenre(value: string): string {
  const trimmed = value.trim();
  return GENRE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function normalizeMood(value: string): string {
  return value.trim().toLowerCase();
}

export interface DiscoveryParseResult {
  ok: boolean;
  request?: NormalizedDiscoveryRequest;
  errors: string[];
}

function coerceLimit(value: number | undefined): { ok: true; limit: number } | { ok: false; error: string } {
  const limit = value ?? DEFAULT_DISCOVERY_LIMIT;

  if (!Number.isInteger(limit)) {
    return { ok: false, error: "limit must be a whole number" };
  }

  if (limit < 1 || limit > MAX_DISCOVERY_LIMIT) {
    return { ok: false, error: `limit must be between 1 and ${MAX_DISCOVERY_LIMIT}` };
  }

  return { ok: true, limit };
}

/** Normalizes and validates a typed discovery request. */
export function resolveDiscoveryRequest(
  input: DiscoveryRequest
): DiscoveryParseResult {
  const errors: string[] = [];

  const rawGenre =
    typeof input.genre === "string" && input.genre.trim().length > 0
      ? normalizeGenre(input.genre)
      : null;
  const rawMood =
    typeof input.mood === "string" && input.mood.trim().length > 0
      ? normalizeMood(input.mood)
      : null;

  if (input.genre !== undefined && !rawGenre) {
    errors.push("genre must be a non-empty string");
  }

  if (input.mood !== undefined && !rawMood) {
    errors.push("mood must be a non-empty string");
  }

  if (!rawGenre && !rawMood) {
    errors.push("At least one of genre or mood is required.");
  }

  let mediaType: MediaType | null = null;

  if (input.mediaType !== undefined && input.mediaType !== "both") {
    if (input.mediaType === "movie" || input.mediaType === "tv") {
      mediaType = input.mediaType;
    } else {
      errors.push(`mediaType must be one of "movie", "tv", or "both"`);
    }
  }

  const limit = coerceLimit(input.limit);
  let normalizedLimit = DEFAULT_DISCOVERY_LIMIT;

  if (!limit.ok) {
    errors.push(limit.error);
  } else {
    normalizedLimit = limit.limit;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    request: {
      genre: rawGenre,
      mood: rawMood,
      mediaType,
      limit: normalizedLimit,
    },
  };
}

/**
 * Parses a discovery request from URL-style query parameters
 * (genre, mood, mediaType, limit). Values must be strings (or a number for
 * limit); invalid values surface as request errors, never as crashes.
 */
export function parseDiscoveryRequest(raw: {
  genre?: unknown;
  mood?: unknown;
  mediaType?: unknown;
  limit?: unknown;
}): DiscoveryParseResult {
  const input: DiscoveryRequest = {};

  if (typeof raw.genre === "string") input.genre = raw.genre;
  if (typeof raw.mood === "string") input.mood = raw.mood;

  if (typeof raw.mediaType === "string") {
    input.mediaType = raw.mediaType as DiscoveryRequest["mediaType"];
  }

  if (typeof raw.limit === "number") {
    input.limit = raw.limit;
  } else if (typeof raw.limit === "string" && raw.limit.trim() !== "") {
    const n = Number(raw.limit);
    input.limit = Number.isFinite(n) ? n : undefined;
  }

  return resolveDiscoveryRequest(input);
}

// ---------------------------------------------------------------------------
// Data gateway
// ---------------------------------------------------------------------------

/**
 * Production gateway backed by the server (service-role) Supabase client. The
 * RPC owns the SQL filtering so the engine stays thin and testable.
 */
export const supabaseDiscoveryDbGateway: DiscoveryDbGateway = {
  async fetchCandidates({ genre, mood, mediaType, limit }) {
    const { data, error } = await getServerSupabaseClient().rpc(
      "oriel_discovery_candidates",
      {
        p_genre: genre,
        p_mood: mood,
        p_media_type: mediaType,
        p_limit: limit,
      }
    );

    if (error) {
      throw new Error(`Unable to load discovery candidates: ${error.message}`);
    }

    return (data as DiscoveryCandidateRow[] | null) ?? [];
  },
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface DiscoveryDeps {
  db: DiscoveryDbGateway;
}

export function resolveDiscoveryDeps(
  partial?: Partial<DiscoveryDeps>
): DiscoveryDeps {
  return { db: partial?.db ?? supabaseDiscoveryDbGateway };
}

function toCandidate(row: DiscoveryCandidateRow): DiscoveryCandidate {
  let semantics: CandidateSemantics | null = null;

  if (row.version != null && row.fields != null) {
    const parsed = parseSemanticFields(row.fields);

    if (parsed.ok) {
      semantics = {
        version: row.version,
        provider: row.provider ?? "",
        model: row.model ?? "",
        fields: parsed.fields,
      };
    }
  }

  return {
    mediaType: row.media_type,
    tmdbId: row.tmdb_id,
    title: row.title,
    releaseDate: row.release_date,
    voteAverage: row.vote_average,
    voteCount: row.vote_count,
    popularity: row.popularity,
    genres: row.genres ?? [],
    semantics,
  };
}

/**
 * Builds a broad, unranked candidate pool for a discovery request.
 *
 * Invalid requests (no genre or mood, unknown mediaType, out-of-range limit)
 * return an error result without touching the data layer.
 */
export async function buildCandidatePool(
  input: DiscoveryRequest,
  deps?: Partial<DiscoveryDeps>
): Promise<DiscoveryResult> {
  const resolved = resolveDiscoveryDeps(deps);
  const normalized = resolveDiscoveryRequest(input);

  if (!normalized.ok || !normalized.request) {
    return { ok: false, errors: normalized.errors };
  }

  const rows = await resolved.db.fetchCandidates({
    genre: normalized.request.genre,
    mood: normalized.request.mood,
    mediaType: normalized.request.mediaType,
    limit: normalized.request.limit,
  });

  const candidates = rows.map(toCandidate);

  const pool: CandidatePool = {
    request: normalized.request,
    count: candidates.length,
    candidates,
  };

  return { ok: true, pool };
}
