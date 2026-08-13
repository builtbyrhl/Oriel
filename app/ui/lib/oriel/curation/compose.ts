// Oriel Curation Engine — end-to-end composition helpers.
//
// Scoring (scoring.ts) and diversity (diversity.ts) stay separate modules; the
// single entry point that wires them together lives here.

import { rankPool } from "./scoring";
import { diversify } from "./diversity";
import type { ScoredCandidate, ScoringConfig } from "./scoring";
import type { DiversityConfig } from "./diversity";
import type { CandidatePool, DeepPartial } from "./types";

/**
 * Ranks a candidate pool with the V1 scorer, then reorders the top of that
 * ranking into a varied discovery pool via greedy MMR.
 *
 * @param pool            The candidate pool produced by buildCandidatePool.
 * @param scoringConfig   Optional scoring weight/constant overrides.
 * @param diversityConfig Optional diversity overrides (target size, lambda,
 *                        window, relevance floor, category weights).
 */
export function buildDiversePool(
  pool: CandidatePool,
  scoringConfig?: DeepPartial<ScoringConfig>,
  diversityConfig?: DeepPartial<DiversityConfig>
): ScoredCandidate[] {
  return diversify(rankPool(pool, scoringConfig), diversityConfig);
}
