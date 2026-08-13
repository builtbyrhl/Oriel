// Oriel Curation Engine — milestone 3: diversity / re-ranking.
//
// `diversify` turns a scored, ranked candidate pool into a varied discovery
// pool using a deterministic greedy MAXIMAL MARGINAL RELEVANCE (MMR) selection:
//
//   value(c) = lambda * relevance(c) - (1 - lambda) * maxSimilarity(c, selected)
//
// The highest-relevance candidate is always chosen first (relevance is never
// lost at the top); each step after that prefers candidates that are both
// relevant and semantically different from what is already chosen.
//
// Similarity is CONTENT-BASED and uses only the stored AI semantic envelope
// (semantic_genres, moods, themes, tone, pacing). It deliberately ignores the
// TMDB genre list, which is constant across a genre-filtered pool, and never
// references a hard-coded genre taxonomy — renaming a subgenre label changes
// nothing about the numbers. An AI provider is never called.
//
// Guards keep diversity from hurting relevance:
//   * windowMultiplier  — only the top max(target, ceil(target * multiplier))
//                         ranked candidates may be selected (depth bound).
//   * minRelevanceRatio — a candidate must score at least this fraction of the
//                         best relevance to be eligible (quality bound).
//   Together these mean a poor candidate is never promoted merely for being
//   different, and high-scoring candidates are preserved unless repetition is
//   excessive.
//
// Missing AI metadata is treated as a NEUTRAL similarity (0.5): an unenriched
// candidate is neither a copy of nor wildly distinct from its peers.
//
// The module is pure and deterministic. Scoring lives in scoring.ts; this
// module never calls it — it only consumes scored candidates.

import type { ScoredCandidate } from "./scoring";
import type { DeepPartial, DiscoveryCandidate } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Per-category weights used by the semantic similarity function. */
export interface DiversityCategoryWeights {
  semanticGenres: number;
  moods: number;
  themes: number;
  tone: number;
  pacing: number;
}

export interface DiversityConfig {
  /** Desired output size; never exceeds the pool size. */
  targetSize: number;
  /**
   * Relevance vs diversity tradeoff in [0, 1]. 1 = pure relevance,
   * 0 = pure diversity. The top-relevance candidate is always chosen first.
   */
  lambda: number;
  /**
   * Depth bound: only the top max(target, ceil(target * windowMultiplier))
   * ranked candidates may be selected. Prevents low-relevance candidates from
   * being promoted just for being different.
   */
  windowMultiplier: number;
  /**
   * Quality bound: a candidate must score at least this fraction of the best
   * relevance in the pool to be eligible.
   */
  minRelevanceRatio: number;
  categories: DiversityCategoryWeights;
}

export const DEFAULT_DIVERSITY_CONFIG: DiversityConfig = {
  targetSize: 20,
  lambda: 0.6,
  windowMultiplier: 2,
  minRelevanceRatio: 0.5,
  categories: {
    semanticGenres: 0.4,
    moods: 0.25,
    themes: 0.2,
    tone: 0.1,
    pacing: 0.05,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Merges a partial configuration over the defaults. */
export function resolveDiversityConfig(
  partial?: DeepPartial<DiversityConfig>
): DiversityConfig {
  const d = DEFAULT_DIVERSITY_CONFIG;
  const p = partial ?? {};

  return {
    targetSize: Math.max(0, Math.round(p.targetSize ?? d.targetSize)),
    lambda: clamp01(p.lambda ?? d.lambda),
    windowMultiplier: Math.max(1, p.windowMultiplier ?? d.windowMultiplier),
    minRelevanceRatio: clamp01(p.minRelevanceRatio ?? d.minRelevanceRatio),
    categories: { ...d.categories, ...p.categories },
  };
}

// ---------------------------------------------------------------------------
// Semantic similarity
// ---------------------------------------------------------------------------

const NEUTRAL_SIMILARITY = 0.5;

function uniqueLower(values: string[] | undefined): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean)));
}

/** Jaccard similarity for string sets; neutral when there is no evidence. */
function setSimilarity(a: string[] | undefined, b: string[] | undefined): number {
  const A = uniqueLower(a);
  const B = uniqueLower(b);

  if (A.length === 0 && B.length === 0) return NEUTRAL_SIMILARITY;
  if (A.length === 0 || B.length === 0) return 0;

  let intersection = 0;
  for (const value of A) {
    if (B.includes(value)) intersection += 1;
  }
  const union = A.length + B.length - intersection;
  return union === 0 ? NEUTRAL_SIMILARITY : intersection / union;
}

function scalarSimilarity(a: string | undefined, b: string | undefined): number {
  if (a == null && b == null) return NEUTRAL_SIMILARITY;
  if (a == null || b == null) return 0;
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
}

/**
 * Content-based similarity of two candidates' AI semantic envelopes in [0, 1].
 * Missing AI metadata is neutral (0.5). The result depends only on the stored
 * semantic strings — never on a hard-coded genre list.
 */
export function semanticSimilarity(
  a: DiscoveryCandidate,
  b: DiscoveryCandidate,
  config?: DeepPartial<DiversityConfig>
): number {
  const cfg = resolveDiversityConfig(config);
  const fa = a.semantics?.fields;
  const fb = b.semantics?.fields;

  if (!fa || !fb) return NEUTRAL_SIMILARITY;

  const w = cfg.categories;
  const total = w.semanticGenres + w.moods + w.themes + w.tone + w.pacing;
  if (total <= 0) return NEUTRAL_SIMILARITY;

  return (
    setSimilarity(fa.semantic_genres, fb.semantic_genres) * w.semanticGenres +
    setSimilarity(fa.moods, fb.moods) * w.moods +
    setSimilarity(fa.themes, fb.themes) * w.themes +
    scalarSimilarity(fa.tone, fb.tone) * w.tone +
    scalarSimilarity(fa.pacing, fb.pacing) * w.pacing
  ) / total;
}

// ---------------------------------------------------------------------------
// Diversify (greedy MMR)
// ---------------------------------------------------------------------------

function sortByRelevance(items: ScoredCandidate[]): ScoredCandidate[] {
  return [...items].sort(
    (a, b) =>
      b.score.total - a.score.total || a.candidate.tmdbId - b.candidate.tmdbId
  );
}

function dedupeByTmdbId(items: ScoredCandidate[]): ScoredCandidate[] {
  const best = new Map<number, ScoredCandidate>();
  for (const item of items) {
    const existing = best.get(item.candidate.tmdbId);
    if (!existing || item.score.total > existing.score.total) {
      best.set(item.candidate.tmdbId, item);
    }
  }
  return items.filter((item) => best.get(item.candidate.tmdbId) === item);
}

function buildSimilarityMatrix(
  items: ScoredCandidate[],
  cfg: DiversityConfig
): number[][] {
  const matrix: number[][] = Array.from({ length: items.length }, () =>
    new Array<number>(items.length).fill(0)
  );

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const similarity = semanticSimilarity(items[i].candidate, items[j].candidate, cfg);
      matrix[i][j] = similarity;
      matrix[j][i] = similarity;
    }
  }

  return matrix;
}

/**
 * Reorders a scored, ranked pool into a varied discovery pool via greedy MMR.
 *
 * Returns at most `targetSize` candidates, deduplicated by tmdbId, ordered by
 * their selection (the most relevant first). Deterministic for identical
 * inputs: ties are broken by ascending tmdbId.
 */
export function diversify(
  scored: ScoredCandidate[],
  config?: DeepPartial<DiversityConfig>
): ScoredCandidate[] {
  const cfg = resolveDiversityConfig(config);
  const ranked = dedupeByTmdbId(sortByRelevance(scored));
  const poolSize = ranked.length;
  const target = Math.min(cfg.targetSize, poolSize);

  if (target <= 0) return [];

  const maxRank = Math.max(target, Math.ceil(target * cfg.windowMultiplier));
  const maxRelevance = ranked[0].score.total;
  const floor = maxRelevance * cfg.minRelevanceRatio;

  let eligible = ranked.filter(
    (item, index) => index < maxRank && item.score.total >= floor
  );

  if (eligible.length < target) {
    const present = new Set(eligible.map((item) => item.candidate.tmdbId));
    for (const item of ranked) {
      if (eligible.length >= target) break;
      if (!present.has(item.candidate.tmdbId)) {
        eligible.push(item);
        present.add(item.candidate.tmdbId);
      }
    }
  }

  const matrix = buildSimilarityMatrix(eligible, cfg);
  const remaining = eligible.map((_, index) => index);
  const chosen: number[] = [];

  while (chosen.length < target && remaining.length > 0) {
    let bestIndex = -1;
    let bestValue = Number.NEGATIVE_INFINITY;

    for (const index of remaining) {
      let maxSimilarity = 0;
      for (const selected of chosen) {
        if (matrix[selected][index] > maxSimilarity) {
          maxSimilarity = matrix[selected][index];
        }
      }

      const value =
        cfg.lambda * eligible[index].score.total -
        (1 - cfg.lambda) * maxSimilarity;

      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    }

    chosen.push(bestIndex);
    remaining.splice(remaining.indexOf(bestIndex), 1);
  }

  return chosen.map((index) => eligible[index]);
}
