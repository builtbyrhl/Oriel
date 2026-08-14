// Oriel Curation Engine — HTTP-facing Spin orchestration.
//
// Single entry point for the Oriel Spin API route. It wires the existing,
// completed Spin engine (`buildSpinSet`) and then ENRICHES each returned
// candidate with the light display metadata the mechanism needs (overview +
// runtime) that the engine deliberately does not carry:
//
//   raw query params → parseDiscoveryRequest (validation)
//     → buildSpinSet (existing Spin engine: pool → scoring → floor → diversity)
//     → detail enrichment (overview / runtime)
//     → Spin set for the UI
//
// The route stays a thin HTTP shell: all business logic lives here and in the
// curation modules. No AI is called during a request, nothing is randomized,
// and `buildSpinSet` is used exactly as shipped — its output is the source of
// truth for which candidates exist and their order.

import { parseDiscoveryRequest } from "./discovery";
import { buildSpinSet } from "./spin";
import type { MediaType } from "../types";
import { getServerSupabaseClient } from "../../supabase/server";
import type { DiscoveryCandidate } from "./types";
import type { CandidateSignals, ScoredCandidate } from "./scoring";
import type { DiscoveryDbGateway, NormalizedDiscoveryRequest } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Loose query values as they arrive on the wire (strings or absent). */
export interface SpinApiQuery {
  genre?: unknown;
  mood?: unknown;
  mediaType?: unknown;
  limit?: unknown;
}

/** One display detail looked up for a candidate. */
export interface SpinDetail {
  overview: string | null;
  runtime: number | null;
}

/** Injectable seam for the detail lookup (testable, server-only by default). */
export interface SpinDetailsGateway {
  fetchDetails(
    keys: { mediaType: MediaType; tmdbId: number }[]
  ): Promise<Map<string, SpinDetail>>;
}

export interface SpinApiDeps {
  db?: DiscoveryDbGateway;
  details?: SpinDetailsGateway;
}

export function detailsKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

/**
 * Production detail gateway backed by the server (service-role) client. Reads
 * only the light browse fields the Spin set needs; never touches AI.
 */
export const supabaseSpinDetailsGateway: SpinDetailsGateway = {
  async fetchDetails(keys) {
    const client = getServerSupabaseClient();
    const found = new Map<string, SpinDetail>();

    const byType = new Map<MediaType, number[]>();
    for (const key of keys) {
      const list = byType.get(key.mediaType) ?? [];
      list.push(key.tmdbId);
      byType.set(key.mediaType, list);
    }

    for (const [mediaType, ids] of byType) {
      const { data, error } = await client
        .from("oriel_movies")
        .select("media_type, tmdb_id, overview, runtime")
        .eq("media_type", mediaType)
        .in("tmdb_id", ids);

      if (error) continue;

      for (const row of data ?? []) {
        found.set(detailsKey(row.media_type, row.tmdb_id), {
          overview: row.overview,
          runtime: row.runtime,
        });
      }
    }

    return found;
  },
};

function resolveDetailsDeps(deps: SpinApiDeps): SpinDetailsGateway {
  return deps.details ?? supabaseSpinDetailsGateway;
}

// ---------------------------------------------------------------------------
// Response shaping
// ---------------------------------------------------------------------------

/** A candidate as exposed by the Spin API — identity + display metadata. */
export interface SpinApiCandidate {
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

export interface SpinApiScore {
  total: number;
  signals: CandidateSignals;
}

export interface SpinApiResult {
  candidate: SpinApiCandidate;
  score: SpinApiScore;
}

export interface SpinApiSuccessBody {
  ok: true;
  /** The validated filters the request resolved to. */
  request: NormalizedDiscoveryRequest;
  /** Number of curated results returned (may be less than limit). */
  count: number;
  candidates: SpinApiResult[];
}

export interface SpinApiErrorBody {
  ok: false;
  errors: string[];
}

export type SpinApiOutcome =
  | { ok: true; status: 200; body: SpinApiSuccessBody }
  | { ok: false; status: 400 | 500; body: SpinApiErrorBody };

function toApiCandidate(
  candidate: DiscoveryCandidate,
  detail?: SpinDetail
): SpinApiCandidate {
  return {
    mediaType: candidate.mediaType,
    tmdbId: candidate.tmdbId,
    title: candidate.title,
    releaseDate: candidate.releaseDate,
    voteAverage: candidate.voteAverage,
    voteCount: candidate.voteCount,
    popularity: candidate.popularity,
    genres: candidate.genres,
    posterPath: candidate.posterPath ?? null,
    backdropPath: candidate.backdropPath ?? null,
    overview: detail?.overview ?? null,
    runtime: detail?.runtime ?? null,
  };
}

function toApiResult(
  { candidate, score }: ScoredCandidate,
  details: Map<string, SpinDetail>
): SpinApiResult {
  return {
    candidate: toApiCandidate(
      candidate,
      details.get(detailsKey(candidate.mediaType, candidate.tmdbId))
    ),
    score,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Runs a Spin request through the engine and enriches the output for display.
 *
 * Returns a structured outcome; the route maps it to an HTTP status. Invalid
 * query parameters never touch the data layer (400). A detail-lookup failure
 * degrades to null overview/runtime rather than failing the whole request —
 * the Spin set is still valuable without the synopsis.
 */
export async function runSpin(
  raw: SpinApiQuery,
  deps: SpinApiDeps = {}
): Promise<SpinApiOutcome> {
  const parsed = parseDiscoveryRequest(raw);

  if (!parsed.ok || !parsed.request) {
    return { ok: false, status: 400, body: { ok: false, errors: parsed.errors } };
  }

  try {
    const request = parsed.request;

    const result = await buildSpinSet(
      {
        genre: request.genre ?? undefined,
        mood: request.mood ?? undefined,
        mediaType: request.mediaType ?? undefined,
        limit: request.limit,
      },
      { deps: { db: deps.db } }
    );

    if (!result.ok) {
      return {
        ok: false,
        status: 500,
        body: { ok: false, errors: result.errors },
      };
    }

    const details = new Map<string, SpinDetail>();
    try {
      const fetched = await resolveDetailsDeps(deps).fetchDetails(
        result.candidates.map(({ candidate }) => ({
          mediaType: candidate.mediaType,
          tmdbId: candidate.tmdbId,
        }))
      );
      if (fetched) {
        for (const [key, detail] of fetched) details.set(key, detail);
      }
    } catch {
      // Display enrichment is best-effort; never let it sink the request.
    }

    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        // The engine's `request` reflects the larger internal pool fetch; the
        // API echoes the caller's result size so consumers see what they asked
        // for, never the pool multiplier leaking out.
        request: { ...result.request, limit: request.limit },
        count: result.count,
        candidates: result.candidates.map((scored) =>
          toApiResult(scored, details)
        ),
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        errors: [
          err instanceof Error ? err.message : "Spin failed unexpectedly.",
        ],
      },
    };
  }
}
