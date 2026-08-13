// Oriel Curation Engine — milestone 2: deterministic media scoring.
//
// `scoreCandidate` turns a discovery candidate into a single 0–1 score from
// eight normalized signals. The module is PURE: it never touches the network,
// the database, or an AI provider. Everything it needs arrives in the
// candidate and the scoring context, so identical inputs always produce
// identical scores (determinism is tested).
//
// Signal policy (mirrored in the scoring tests):
//   * Every signal is normalized to 0–1.
//   * Quality is confidence-adjusted: the raw vote_average is shrunk toward a
//     neutral prior by the logarithmic vote-count curve, so a handful of 10/10
//     votes cannot dominate a well-voted 8.5.
//   * Vote-count and popularity use logarithmic curves (diminishing returns).
//   * Genre and mood are optional. When a dimension is absent from the
//     request its signal is NEUTRAL (0.5); when present, fit is measured
//     against stored metadata — never by calling an AI provider.
//   * Recency ramps down to a configurable floor (never zero) so old titles
//     stay eligible.
//   * discoverability and metadataConfidence measure the presence of
//     discovery-relevant metadata; absent metadata yields their honest value.
//
// All weights and constants live in `ScoringConfig`; `DEFAULT_SCORING_CONFIG`
// is the single source of truth and callers may override any subset of it.
//
// Diversity, personalization and Spin are intentionally out of scope.

import { normalizeGenre, normalizeMood } from "./discovery";
import type {
  CandidatePool,
  DeepPartial,
  DiscoveryCandidate,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  /** Confidence-adjusted quality (vote_average shrunk toward the prior). */
  quality: number;
  /** How many votes back the rating (logarithmic curve). */
  voteConfidence: number;
  /** Match between the requested genre and the candidate's genres. */
  genreFit: number;
  /** Match between the requested mood and the candidate's AI moods. */
  moodFit: number;
  /** Logarithmic popularity signal. */
  popularity: number;
  /** Release recency with a non-zero floor for old titles. */
  recency: number;
  /** Presence of discovery-enabling metadata (genres + AI semantics). */
  discoverability: number;
  /** Completeness of the numeric browse metadata. */
  metadataConfidence: number;
}

export interface VoteCurveConfig {
  /** Rating scale ceiling (TMDB uses 0–10). */
  maxRating: number;
  /** Quality neutral prior; a rating with zero confidence collapses here. */
  priorQuality: number;
  /** Vote count that maps to full confidence on the log curve. */
  fullConfidenceVotes: number;
}

export interface PopularityCurveConfig {
  /** Popularity value that maps to 1.0 on the log curve. */
  fullPopularity: number;
}

export interface RecencyCurveConfig {
  /**
   * ISO date (yyyy-mm-dd) the recency signal is measured against. Optional;
   * defaults to today. Inject a fixed date to keep scoring deterministic
   * across runs.
   */
  referenceDate?: string;
  /** Age (days) at which recency reaches its floor and stops declining. */
  floorScoreAgeDays: number;
  /** Recency value for old titles; never zero so they stay eligible. */
  floorScore: number;
}

/** Every weight and constant the scorer needs lives here. */
export interface ScoringConfig {
  weights: ScoringWeights;
  vote: VoteCurveConfig;
  popularity: PopularityCurveConfig;
  recency: RecencyCurveConfig;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    quality: 0.3,
    voteConfidence: 0.15,
    genreFit: 0.1,
    moodFit: 0.1,
    popularity: 0.15,
    recency: 0.1,
    discoverability: 0.05,
    metadataConfidence: 0.05,
  },
  vote: {
    maxRating: 10,
    priorQuality: 0.5,
    fullConfidenceVotes: 1000,
  },
  popularity: {
    fullPopularity: 1000,
  },
  recency: {
    floorScoreAgeDays: 7300, // ~20 years
    floorScore: 0.5,
  },
};

/** Merges a partial configuration over the defaults. */
export function resolveScoringConfig(
  partial?: DeepPartial<ScoringConfig>
): ScoringConfig {
  if (!partial) {
    return DEFAULT_SCORING_CONFIG;
  }

  return {
    weights: { ...DEFAULT_SCORING_CONFIG.weights, ...partial.weights },
    vote: { ...DEFAULT_SCORING_CONFIG.vote, ...partial.vote },
    popularity: { ...DEFAULT_SCORING_CONFIG.popularity, ...partial.popularity },
    recency: { ...DEFAULT_SCORING_CONFIG.recency, ...partial.recency },
  };
}

// ---------------------------------------------------------------------------
// Score types
// ---------------------------------------------------------------------------

/** The discovery dimensions a candidate is scored against. */
export interface ScoringContext {
  /** Normalized requested genre; null when genre is not part of the request. */
  genre: string | null;
  /** Normalized requested mood; null when mood is not part of the request. */
  mood: string | null;
}

/** The eight normalized (0–1) signals behind a score. */
export interface CandidateSignals {
  quality: number;
  voteConfidence: number;
  genreFit: number;
  moodFit: number;
  popularity: number;
  recency: number;
  discoverability: number;
  metadataConfidence: number;
}

export interface ScoreBreakdown {
  /** Final weighted score in [0, 1]. */
  total: number;
  signals: CandidateSignals;
}

export interface ScoredCandidate {
  candidate: DiscoveryCandidate;
  score: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const NEUTRAL = 0.5;
const MS_PER_DAY = 86_400_000;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mean(values: boolean[]): number {
  if (values.length === 0) return 0;
  return values.filter(Boolean).length / values.length;
}

/**
 * Logarithmic curve mapping `value` to 0–1: 0 -> 0, `full` -> 1, with
 * diminishing returns in between.
 */
function logCurve(value: number, full: number): number {
  if (value <= 0 || full <= 0) return 0;
  return clamp01(Math.log(1 + value) / Math.log(1 + full));
}

/** Days between two ISO dates (releaseDate earlier than reference -> positive). */
function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}

function referenceDate(config: RecencyCurveConfig): string {
  return config.referenceDate ?? new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Individual signals (all pure, all 0–1)
// ---------------------------------------------------------------------------

/**
 * Confidence in a candidate's vote count on a log curve. 0 votes -> 0;
 * `fullConfidenceVotes` -> 1. Used both as its own signal and to shrink
 * quality toward the neutral prior.
 */
export function voteConfidence(
  candidate: DiscoveryCandidate,
  config: ScoringConfig
): number {
  if (candidate.voteCount == null) return 0;
  return logCurve(candidate.voteCount, config.vote.fullConfidenceVotes);
}

/**
 * Confidence-adjusted quality. The raw vote_average is shrunk toward the
 * neutral prior by the vote-count confidence, so an 8.5 with 5,000 votes
 * beats a 9.0 with 3 votes, and a rating with no vote count collapses to
 * the prior. Missing vote_average is neutral.
 */
export function voteQuality(
  candidate: DiscoveryCandidate,
  config: ScoringConfig
): number {
  if (candidate.voteAverage == null) return NEUTRAL;

  const voteScore = clamp01(candidate.voteAverage / config.vote.maxRating);
  const confidence = voteConfidence(candidate, config);

  return clamp01(
    config.vote.priorQuality +
      (voteScore - config.vote.priorQuality) * confidence
  );
}

/** Logarithmic popularity. Missing popularity is neutral. */
export function popularityScore(
  candidate: DiscoveryCandidate,
  config: ScoringConfig
): number {
  if (candidate.popularity == null) return NEUTRAL;
  return logCurve(candidate.popularity, config.popularity.fullPopularity);
}

/**
 * Genre fit. Neutral when the request has no genre; otherwise a
 * case-insensitive match against the candidate's stored genres (aliases like
 * "sci-fi" -> "Science Fiction" are normalized).
 */
export function genreFitScore(
  candidate: DiscoveryCandidate,
  context: ScoringContext,
  config: ScoringConfig
): number {
  if (context.genre == null) return NEUTRAL;

  const needle = normalizeGenre(context.genre).toLowerCase();
  return candidate.genres.some((genre) => genre.toLowerCase() === needle) ? 1 : 0;
}

/**
 * Mood / semantic fit. Neutral when the request has no mood; otherwise a
 * case-insensitive match against the stored AI `moods` array. Candidates
 * without AI semantics cannot match a mood and score 0.
 */
export function moodFitScore(
  candidate: DiscoveryCandidate,
  context: ScoringContext,
  config: ScoringConfig
): number {
  if (context.mood == null) return NEUTRAL;

  const fields = candidate.semantics?.fields;
  if (!fields) return 0;

  const needle = normalizeMood(context.mood);
  return fields.moods.some((mood) => mood.toLowerCase() === needle) ? 1 : 0;
}

/**
 * Release recency. Linear ramp from 1.0 (today) down to a non-zero floor at
 * `floorScoreAgeDays`; anything older stays at the floor. Missing release
 * date is neutral; future releases score 1.0.
 */
export function recencyScore(
  candidate: DiscoveryCandidate,
  config: ScoringConfig
): number {
  if (!candidate.releaseDate) return NEUTRAL;

  const ageDays = daysBetween(candidate.releaseDate, referenceDate(config.recency));

  if (ageDays <= 0) return 1;
  if (ageDays >= config.recency.floorScoreAgeDays) {
    return config.recency.floorScore;
  }

  const { floorScoreAgeDays, floorScore } = config.recency;
  return 1 - (1 - floorScore) * (ageDays / floorScoreAgeDays);
}

/**
 * How findable the item is through Oriel's discovery surfaces: genre browse
 * (has genres) and mood browse (has AI semantics).
 */
export function discoverabilityScore(candidate: DiscoveryCandidate): number {
  return mean([
    candidate.genres.length > 0,
    candidate.semantics != null,
  ]);
}

/**
 * Completeness of the numeric browse metadata the other signals lean on.
 * Absent fields yield an honest (lower) value, not a neutral one.
 */
export function metadataConfidenceScore(candidate: DiscoveryCandidate): number {
  return mean([
    candidate.voteAverage != null,
    candidate.voteCount != null,
    candidate.popularity != null,
    candidate.releaseDate != null,
  ]);
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** Computes the eight normalized signals for a candidate. */
export function computeSignals(
  candidate: DiscoveryCandidate,
  context: ScoringContext,
  config?: DeepPartial<ScoringConfig>
): CandidateSignals {
  const resolved = resolveScoringConfig(config);

  return {
    quality: voteQuality(candidate, resolved),
    voteConfidence: voteConfidence(candidate, resolved),
    genreFit: genreFitScore(candidate, context, resolved),
    moodFit: moodFitScore(candidate, context, resolved),
    popularity: popularityScore(candidate, resolved),
    recency: recencyScore(candidate, resolved),
    discoverability: discoverabilityScore(candidate),
    metadataConfidence: metadataConfidenceScore(candidate),
  };
}

/**
 * Scores a single candidate in [0, 1]: the weighted mean of its signals,
 * normalized by the total configured weight so the score stays comparable
 * regardless of which signals are active.
 */
export function scoreCandidate(
  candidate: DiscoveryCandidate,
  context: ScoringContext,
  config?: DeepPartial<ScoringConfig>
): ScoreBreakdown {
  const resolved = resolveScoringConfig(config);
  const signals = computeSignals(candidate, context, resolved);
  const w = resolved.weights;

  const totalWeight =
    w.quality +
    w.voteConfidence +
    w.genreFit +
    w.moodFit +
    w.popularity +
    w.recency +
    w.discoverability +
    w.metadataConfidence;

  const weighted =
    signals.quality * w.quality +
    signals.voteConfidence * w.voteConfidence +
    signals.genreFit * w.genreFit +
    signals.moodFit * w.moodFit +
    signals.popularity * w.popularity +
    signals.recency * w.recency +
    signals.discoverability * w.discoverability +
    signals.metadataConfidence * w.metadataConfidence;

  return {
    total: totalWeight === 0 ? 0 : weighted / totalWeight,
    signals,
  };
}

/**
 * Scores and ranks every candidate in a pool, highest score first. Ties are
 * broken by ascending tmdbId so the ordering is deterministic.
 */
export function rankPool(
  pool: CandidatePool,
  config?: DeepPartial<ScoringConfig>
): ScoredCandidate[] {
  const context: ScoringContext = {
    genre: pool.request.genre,
    mood: pool.request.mood,
  };

  return pool.candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, context, config),
    }))
    .sort(
      (a, b) => b.score.total - a.score.total || a.candidate.tmdbId - b.candidate.tmdbId
    );
}
