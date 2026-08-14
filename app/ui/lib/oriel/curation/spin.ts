// Oriel Curation Engine — Spin exploration.
//
// Spin answers a different question than discovery:
//
//   discovery: "what are the *best* movies matching this request?"
//   spin:      "what are several strong but *meaningfully different* movies
//              I might enjoy exploring?"
//
// It therefore optimizes RELEVANCE + QUALITY + EXPLORATION, not top score alone.
//
// This module is a thin, deterministic orchestrator over the EXISTING engine:
//
//   Spin request
//     -> resolveDiscoveryRequest            (existing validation)
//     -> buildCandidatePool with a LARGER limit   (existing discovery / RPC)
//     -> rankPool                            (existing Oriel scorer)
//     -> quality-floor filter                (Spin-only; see below)
//     -> dedupe by tmdbId                    (Spin-only; no duplicate ids)
//     -> diversify with Spin-tuned config    (existing greedy MMR diversity)
//     -> Spin set
//
// "Strongest first", the semantic redundancy penalty, and the MMR window
// bound are all provided by `diversify`; the score itself comes from
// `rankPool`. Spin does NOT re-implement scoring or similarity. There are no
// AI calls at request time; everything runs on the stored semantic envelope.
//
// The genuinely new pieces here are: (1) a larger internal candidate pool than
// the result size (breadth for exploration), (2) Spin-tuned diversity weights,
// (3) an explicit quality-floor filter, and (4) cross-type tmdbId dedupe.
//
// WHY the floor filter exists here and not only inside `diversify`: when fewer
// candidates than the target pass its window + floor eligibility, `diversify`
// BACKFILLS the set with whatever is left, regardless of the floor. That is
// correct for discovery (fill the page) but wrong for Spin, whose quality
// floor must never be lowered to reach resultSize. Spin therefore enforces the
// floor BEFORE diversify so the backfill can only ever pick from above-floor
// candidates — a weak pool simply returns fewer results.

import {
  MAX_DISCOVERY_LIMIT,
  buildCandidatePool,
  resolveDiscoveryRequest,
} from "./discovery";
import { rankPool } from "./scoring";
import { diversify } from "./diversity";
import type { ScoredCandidate, ScoringConfig } from "./scoring";
import type {
  CandidatePool,
  DeepPartial,
  DiscoveryRequest,
  DiscoveryDbGateway,
  NormalizedDiscoveryRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Spin configuration
// ---------------------------------------------------------------------------

export interface SpinConfig {
  /** Number of results the Spin set should contain (clamped to [1, 200]). */
  resultSize: number;
  /**
   * How many candidates to pull from the DB relative to `resultSize` so that
   * the MMR selector has enough distinct material to build a varied set.
   * Example: resultSize 20 with poolMultiplier 2.5 -> a 50-row pool.
   */
  poolMultiplier: number;
  /** MMR lambda: 1 = pure relevance, 0 = pure diversity. Lower favors variety. */
  lambda: number;
  /**
   * Quality floor: a candidate must score at least this fraction of the best
   * relevance to be eligible — so diversity never promotes garbage.
   */
  minRelevanceRatio: number;
  /** How deep the MMR window reaches beyond resultSize. */
  windowMultiplier: number;
}

export const DEFAULT_SPIN_CONFIG: SpinConfig = {
  resultSize: 20,
  poolMultiplier: 2.5,
  lambda: 0.55,
  minRelevanceRatio: 0.7,
  windowMultiplier: 3,
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Merges a partial Spin config over the defaults. */
export function resolveSpinConfig(
  partial?: DeepPartial<SpinConfig>
): SpinConfig {
  const d = DEFAULT_SPIN_CONFIG;
  const p = partial ?? {};

  return {
    resultSize: Math.max(
      1,
      Math.min(p.resultSize ?? d.resultSize, MAX_DISCOVERY_LIMIT)
    ),
    poolMultiplier: Math.max(0.1, p.poolMultiplier ?? d.poolMultiplier),
    lambda: clamp01(p.lambda ?? d.lambda),
    minRelevanceRatio: clamp01(p.minRelevanceRatio ?? d.minRelevanceRatio),
    windowMultiplier: Math.max(1, p.windowMultiplier ?? d.windowMultiplier),
  };
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * Request shape for Spin. It mirrors `DiscoveryRequest` exactly; the only
 * behavioral difference is that `limit` is the desired Spin set size rather
 * than the raw DB fetch size (Spin fetches a larger pool internally).
 */
export type SpinRequest = DiscoveryRequest;

export interface SpinSuccessBody {
  ok: true;
  request: NormalizedDiscoveryRequest;
  /** Number of candidates actually returned (may be < resultSize). */
  count: number;
  candidates: ScoredCandidate[];
}

export type SpinResult =
  | SpinSuccessBody
  | { ok: false; errors: string[] };

export interface SpinDeps {
  db?: DiscoveryDbGateway;
}

/**
 * Computes the number of candidates to pull from the data layer for a result
 * size: enough for MMR to pick a varied set, capped at the discovery maximum.
 */
export function computeSpinPoolSize(
  resultSize: number,
  poolMultiplier: number
): number {
  const desired = Math.ceil(resultSize * poolMultiplier);
  return Math.min(MAX_DISCOVERY_LIMIT, Math.max(resultSize, desired));
}

// ---------------------------------------------------------------------------
// No duplicate ids
// ---------------------------------------------------------------------------

/**
 * Removes duplicate rows, keeping the higher-scoring one per tmdbId — across
 * media types too. TMDB ids are namespaced per type, so when a request spans
 * both types a (movie id 42, tv id 42)` collision would otherwise surface as
 * two confusingly identical ids in one Spin set; keeping only the strongest
 * guarantees every result has a distinct id. (This mirrors the dedupe inside
 * `diversify`, applied before the similarity matrix so duplicates never waste
 * an MMR slot.)
 */
function dedupeByTmdbId(items: ScoredCandidate[]): ScoredCandidate[] {
  const best = new Map<number, ScoredCandidate>();

  for (const item of items) {
    const existing = best.get(item.candidate.tmdbId);

    if (!existing || item.score.total > existing.score.total) {
      best.set(item.candidate.tmdbId, item);
    }
  }

  return Array.from(best.values()).sort(
    (a, b) =>
      b.score.total - a.score.total ||
      a.candidate.tmdbId - b.candidate.tmdbId
  );
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Builds a curated, diverse exploration set for a Spin request.
 *
 * Reuses the existing candidate pool builder, scorer, and MMR diversity
 * selector; only the pool depth and diversity weights are Spin-specific. The
 * first result is always the strongest by Oriel's relevance score, and the
 * ordering is fully deterministic for identical inputs.
 */
export async function buildSpinSet(
  input: SpinRequest,
  options: {
    config?: DeepPartial<SpinConfig>;
    scoring?: DeepPartial<ScoringConfig>;
    deps?: SpinDeps;
  } = {}
): Promise<SpinResult> {
  const parsed = resolveDiscoveryRequest(input);

  if (!parsed.ok || !parsed.request) {
    return { ok: false, errors: parsed.errors };
  }

  const cfg = resolveSpinConfig({
    ...options.config,
    // A request-level `limit` is the authoritative result size; when it is
    // absent, fall back to the (possibly config-provided) default.
    ...(input.limit != null ? { resultSize: input.limit } : {}),
  });

  const resultSize = cfg.resultSize;
  const poolSize = computeSpinPoolSize(resultSize, cfg.poolMultiplier);

  const poolResult = await buildCandidatePool(
    {
      genre: parsed.request.genre ?? undefined,
      mood: parsed.request.mood ?? undefined,
      mediaType: parsed.request.mediaType ?? undefined,
      limit: poolSize,
    },
    { db: options.deps?.db }
  );

  if (!poolResult.ok) {
    return { ok: false, errors: poolResult.errors };
  }

  const pool: CandidatePool = poolResult.pool;

  // Existing scorer, then Spin's two invariants, then the existing diversity
  // selector — no scoring or similarity logic is re-implemented here.
  const ranked = rankPool(pool, options.scoring);
  const deduped = dedupeByTmdbId(ranked);

  const maxRelevance = deduped.length > 0 ? deduped[0].score.total : 0;
  const floor = maxRelevance * cfg.minRelevanceRatio;
  const aboveFloor = deduped.filter((item) => item.score.total >= floor);

  const spin = diversify(aboveFloor, {
    targetSize: resultSize,
    lambda: cfg.lambda,
    minRelevanceRatio: cfg.minRelevanceRatio,
    windowMultiplier: cfg.windowMultiplier,
  });

  return {
    ok: true,
    request: pool.request,
    count: spin.length,
    candidates: spin,
  };
}
