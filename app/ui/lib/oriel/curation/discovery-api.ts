// Oriel Curation Engine — HTTP-facing discovery orchestration.
//
// Single entry point for the Oriel Discovery API route. Wires the existing
// engines in sequence and shapes the stable JSON response:
//
//   raw query params → parseDiscoveryRequest (validation)
//     → buildCandidatePool (discovery)
//     → rankPool + diversify (buildDiversePool)
//     → curated, scored candidates
//
// The route stays a thin HTTP shell: all business logic lives here and in the
// curation modules. No AI is called during a request — the AI envelope is only
// read from what discovery already stored.

import { buildCandidatePool, parseDiscoveryRequest } from "./discovery";
import { buildDiversePool } from "./compose";
import type { DiscoveryCandidate } from "./types";
import type { CandidateSignals, ScoredCandidate } from "./scoring";
import type { DiscoveryDbGateway, NormalizedDiscoveryRequest } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Loose query values as they arrive on the wire (strings or absent). */
export interface DiscoveryApiQuery {
  genre?: unknown;
  mood?: unknown;
  mediaType?: unknown;
  limit?: unknown;
}

export interface DiscoveryApiDeps {
  db?: DiscoveryDbGateway;
}

/** A candidate as exposed by the API — media identity, no AI envelope. */
export type DiscoveryApiCandidate = Omit<DiscoveryCandidate, "semantics">;

export interface DiscoveryApiScore {
  total: number;
  signals: CandidateSignals;
}

export interface DiscoveryApiResult {
  candidate: DiscoveryApiCandidate;
  score: DiscoveryApiScore;
}

export interface DiscoveryApiSuccessBody {
  ok: true;
  /** The validated filters the request resolved to. */
  request: NormalizedDiscoveryRequest;
  /** Number of curated results returned. */
  count: number;
  results: DiscoveryApiResult[];
}

export interface DiscoveryApiErrorBody {
  ok: false;
  errors: string[];
}

export type DiscoveryApiOutcome =
  | { ok: true; status: 200; body: DiscoveryApiSuccessBody }
  | { ok: false; status: 400 | 500; body: DiscoveryApiErrorBody };

// ---------------------------------------------------------------------------
// Response shaping
// ---------------------------------------------------------------------------

function toApiCandidate(candidate: DiscoveryCandidate): DiscoveryApiCandidate {
  return {
    mediaType: candidate.mediaType,
    tmdbId: candidate.tmdbId,
    title: candidate.title,
    releaseDate: candidate.releaseDate,
    voteAverage: candidate.voteAverage,
    voteCount: candidate.voteCount,
    popularity: candidate.popularity,
    genres: candidate.genres,
  };
}

function toApiResult({ candidate, score }: ScoredCandidate): DiscoveryApiResult {
  return { candidate: toApiCandidate(candidate), score };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Runs a discovery request through the full curation pipeline.
 *
 * Returns a structured outcome; the route maps it to an HTTP status. Invalid
 * query parameters never touch the data layer (400), and a downstream failure
 * never leaks as anything but a 500 with a message.
 */
export async function runDiscovery(
  raw: DiscoveryApiQuery,
  deps: DiscoveryApiDeps = {}
): Promise<DiscoveryApiOutcome> {
  const parsed = parseDiscoveryRequest(raw);

  if (!parsed.ok || !parsed.request) {
    return { ok: false, status: 400, body: { ok: false, errors: parsed.errors } };
  }

  try {
    const { request } = parsed;

    const poolResult = await buildCandidatePool(
      {
        genre: request.genre ?? undefined,
        mood: request.mood ?? undefined,
        mediaType: request.mediaType ?? undefined,
        limit: request.limit,
      },
      { db: deps.db }
    );

    if (!poolResult.ok) {
      // Unreachable after a successful parse, but never swallow an error.
      return {
        ok: false,
        status: 500,
        body: { ok: false, errors: poolResult.errors },
      };
    }

    const curated = buildDiversePool(poolResult.pool, undefined, {
      targetSize: poolResult.pool.request.limit,
    });

    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        request: poolResult.pool.request,
        count: curated.length,
        results: curated.map(toApiResult),
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        errors: [
          err instanceof Error
            ? err.message
            : "Discovery failed unexpectedly.",
        ],
      },
    };
  }
}
