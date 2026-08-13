// Scoring engine tests (node:test, run with tsx loader).
//
// The scorer is PURE: everything lives in the candidate + context + config
// arguments. These tests construct candidates directly and assert on the
// resulting signals and totals — no database, no AI provider.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeSignals,
  DEFAULT_SCORING_CONFIG,
  discoverabilityScore,
  genreFitScore,
  moodFitScore,
  popularityScore,
  rankPool,
  recencyScore,
  resolveScoringConfig,
  scoreCandidate,
  voteConfidence,
  voteQuality,
} from "./scoring";
import type { DeepPartial, ScoringConfig, ScoringContext } from "./scoring";
import type { CandidatePool, CandidateSemantics, DiscoveryCandidate } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function candidate(
  overrides: Partial<DiscoveryCandidate> = {}
): DiscoveryCandidate {
  return {
    mediaType: "movie",
    tmdbId: 1,
    title: "Test",
    releaseDate: "2020-06-15",
    voteAverage: 7.0,
    voteCount: 500,
    popularity: 50,
    genres: ["Horror"],
    semantics: null,
    ...overrides,
  };
}

function semantics(
  moods: string[],
  overrides: Partial<CandidateSemantics["fields"]> = {}
): CandidateSemantics {
  return {
    version: 1,
    provider: "gemini",
    model: "gemini-test",
    fields: {
      moods,
      tone: "dark",
      pacing: "moderate",
      themes: ["survival"],
      semantic_genres: ["Horror"],
      intensity: 7,
      audience_descriptors: ["fans of horror"],
      ...overrides,
    },
  };
}

const NO_DIMS: ScoringContext = { genre: null, mood: null };
const FIXED_REF = "2026-01-01";
const FIXED_REF_CONFIG: DeepPartial<ScoringConfig> = {
  recency: { referenceDate: FIXED_REF },
};
const DEFAULT_CFG = resolveScoringConfig();

function pool(
  request: { genre: string | null; mood: string | null },
  candidates: DiscoveryCandidate[]
): CandidatePool {
  return {
    request: { genre: request.genre, mood: request.mood, mediaType: null, limit: 10 },
    count: candidates.length,
    candidates,
  };
}

function inRange(value: number): boolean {
  return value >= 0 && value <= 1;
}

// ---------------------------------------------------------------------------
// Confidence-adjusted quality
// ---------------------------------------------------------------------------

describe("scoring — confidence-adjusted quality", () => {
  it("prefers a well-voted 8.5 over a barely-voted 9.0", () => {
    const highVote = candidate({ voteAverage: 8.5, voteCount: 5000 });
    const lowVote = candidate({ voteAverage: 9.0, voteCount: 3 });

    const qHigh = voteQuality(highVote, DEFAULT_CFG);
    const qLow = voteQuality(lowVote, DEFAULT_CFG);

    assert.ok(qHigh > qLow, `expected ${qHigh} > ${qLow}`);
    assert.ok(qHigh > 0.8, "high-vote rating should keep most of its quality");
  });

  it("does not let raw vote_average dominate (low-vote 9.0 collapses)", () => {
    const lowVote = candidate({ voteAverage: 9.0, voteCount: 3 });

    const qLow = voteQuality(lowVote, DEFAULT_CFG);
    const vcLow = voteConfidence(lowVote, DEFAULT_CFG);

    assert.ok(qLow < 0.7, `raw 9.0 must not survive: got ${qLow}`);
    assert.ok(vcLow < 0.5, "three votes should carry little confidence");
  });

  it("ranks the well-voted movie above the barely-voted one overall", () => {
    const highVote = candidate({ voteAverage: 8.5, voteCount: 5000 });
    const lowVote = candidate({ voteAverage: 9.0, voteCount: 3 });

    const a = scoreCandidate(highVote, NO_DIMS);
    const b = scoreCandidate(lowVote, NO_DIMS);

    assert.ok(a.total > b.total, `expected ${a.total} > ${b.total}`);
  });

  it("is neutral when vote_average is missing", () => {
    const q = voteQuality(candidate({ voteAverage: null, voteCount: 500 }), DEFAULT_CFG);
    assert.equal(q, 0.5);
  });

  it("collapses to the prior when vote_count is missing", () => {
    const q = voteQuality(candidate({ voteAverage: 9.0, voteCount: null }), DEFAULT_CFG);
    assert.equal(q, DEFAULT_SCORING_CONFIG.vote.priorQuality);
  });
});

// ---------------------------------------------------------------------------
// Vote-confidence log curve
// ---------------------------------------------------------------------------

describe("scoring — vote confidence (log curve)", () => {
  it("maps 0 votes to 0 and full-confidence votes to 1", () => {
    assert.equal(voteConfidence(candidate({ voteCount: 0 }), DEFAULT_CFG), 0);
    assert.equal(voteConfidence(candidate({ voteCount: null }), DEFAULT_CFG), 0);
    assert.equal(
      voteConfidence(
        candidate({ voteCount: DEFAULT_SCORING_CONFIG.vote.fullConfidenceVotes }),
        DEFAULT_CFG
      ),
      1
    );
  });

  it("is monotonic", () => {
    const c = (votes: number) =>
      voteConfidence(candidate({ voteCount: votes }), DEFAULT_CFG);

    assert.ok(c(10) < c(100));
    assert.ok(c(100) < c(1000));
  });

  it("has diminishing returns (concave, logarithmic)", () => {
    const c = (votes: number) =>
      voteConfidence(candidate({ voteCount: votes }), DEFAULT_CFG);

    const firstStep = c(100) - c(10);
    const secondStep = c(500) - c(100);

    assert.ok(secondStep < firstStep, "each additional order of magnitude adds less");
  });
});

// ---------------------------------------------------------------------------
// Popularity log curve
// ---------------------------------------------------------------------------

describe("scoring — popularity (log curve)", () => {
  it("is neutral when popularity is missing", () => {
    assert.equal(popularityScore(candidate({ popularity: null }), DEFAULT_CFG), 0.5);
  });

  it("maps 0 to 0 and full popularity to 1", () => {
    assert.equal(popularityScore(candidate({ popularity: 0 }), DEFAULT_CFG), 0);
    assert.equal(
      popularityScore(
        candidate({ popularity: DEFAULT_SCORING_CONFIG.popularity.fullPopularity }),
        DEFAULT_CFG
      ),
      1
    );
  });

  it("is monotonic with diminishing returns", () => {
    const p = (value: number) =>
      popularityScore(candidate({ popularity: value }), DEFAULT_CFG);

    assert.ok(p(10) < p(100));
    assert.ok(p(100) - p(10) > p(500) - p(100));
  });
});

// ---------------------------------------------------------------------------
// Recency + old-movie eligibility
// ---------------------------------------------------------------------------

describe("scoring — recency", () => {
  it("scores recent releases near 1.0", () => {
    const r = recencyScore(
      candidate({ releaseDate: "2025-12-31" }),
      resolveScoringConfig(FIXED_REF_CONFIG)
    );
    assert.ok(r > 0.99);
  });

  it("floors old releases at the floor score (never zero)", () => {
    const r = recencyScore(
      candidate({ releaseDate: "1975-01-01" }),
      resolveScoringConfig(FIXED_REF_CONFIG)
    );
    assert.equal(r, DEFAULT_SCORING_CONFIG.recency.floorScore);
    assert.ok(r > 0, "old movies must remain eligible");
  });

  it("is neutral when release date is missing", () => {
    const r = recencyScore(
      candidate({ releaseDate: null }),
      resolveScoringConfig(FIXED_REF_CONFIG)
    );
    assert.equal(r, 0.5);
  });

  it("scores future releases at 1.0", () => {
    const r = recencyScore(
      candidate({ releaseDate: "2026-06-01" }),
      resolveScoringConfig(FIXED_REF_CONFIG)
    );
    assert.equal(r, 1);
  });

  it("lets an old excellent movie beat a recent mediocre one", () => {
    const oldClassic = candidate({
      tmdbId: 1,
      title: "Old Classic",
      releaseDate: "1975-06-20",
      voteAverage: 8.8,
      voteCount: 8000,
      popularity: 30,
      genres: ["Horror"],
      semantics: null,
    });
    const recentMeh = candidate({
      tmdbId: 2,
      title: "Recent Meh",
      releaseDate: "2025-06-20",
      voteAverage: 6.0,
      voteCount: 200,
      popularity: 90,
      genres: ["Horror"],
      semantics: null,
    });

    const old = scoreCandidate(oldClassic, { genre: "horror", mood: null }, FIXED_REF_CONFIG);
    const recent = scoreCandidate(recentMeh, { genre: "horror", mood: null }, FIXED_REF_CONFIG);

    assert.ok(old.total > recent.total, `expected ${old.total} > ${recent.total}`);
    assert.ok(
      recencyScore(recentMeh, resolveScoringConfig(FIXED_REF_CONFIG)) >
        recencyScore(oldClassic, resolveScoringConfig(FIXED_REF_CONFIG))
    );
  });
});

// ---------------------------------------------------------------------------
// Genre fit
// ---------------------------------------------------------------------------

describe("scoring — genre fit", () => {
  it("is 1 when the candidate matches the requested genre", () => {
    const c = candidate({ genres: ["Horror", "Thriller"] });
    assert.equal(genreFitScore(c, { genre: "horror", mood: null }, DEFAULT_CFG), 1);
  });

  it("is 0 when the candidate does not match", () => {
    const c = candidate({ genres: ["Comedy"] });
    assert.equal(genreFitScore(c, { genre: "horror", mood: null }, DEFAULT_CFG), 0);
  });

  it("is neutral when the request has no genre", () => {
    assert.equal(genreFitScore(candidate(), NO_DIMS, DEFAULT_CFG), 0.5);
  });

  it("resolves aliases (sci-fi -> Science Fiction)", () => {
    const c = candidate({ genres: ["Science Fiction"] });
    assert.equal(genreFitScore(c, { genre: "sci-fi", mood: null }, DEFAULT_CFG), 1);
  });
});

// ---------------------------------------------------------------------------
// Mood / semantic fit
// ---------------------------------------------------------------------------

describe("scoring — mood fit", () => {
  it("is 1 when the stored AI moods include the requested mood", () => {
    const c = candidate({ semantics: semantics(["dark", "tense"]) });
    assert.equal(moodFitScore(c, { genre: null, mood: "dark" }, DEFAULT_CFG), 1);
  });

  it("matches case-insensitively", () => {
    const c = candidate({ semantics: semantics(["Dark", "Tense"]) });
    assert.equal(moodFitScore(c, { genre: null, mood: "dark" }, DEFAULT_CFG), 1);
  });

  it("is 0 when the stored moods do not match", () => {
    const c = candidate({ semantics: semantics(["funny", "light"]) });
    assert.equal(moodFitScore(c, { genre: null, mood: "dark" }, DEFAULT_CFG), 0);
  });

  it("is 0 for candidates without AI semantics", () => {
    const c = candidate({ semantics: null });
    assert.equal(moodFitScore(c, { genre: null, mood: "dark" }, DEFAULT_CFG), 0);
  });

  it("is neutral when the request has no mood", () => {
    assert.equal(moodFitScore(candidate(), NO_DIMS, DEFAULT_CFG), 0.5);
  });
});

// ---------------------------------------------------------------------------
// Genre + mood combined relevance
// ---------------------------------------------------------------------------

describe("scoring — genre + mood combined", () => {
  it("scores both dimensions when both are requested", () => {
    const both = candidate({
      genres: ["Horror"],
      semantics: semantics(["dark"]),
    });
    const genreOnly = candidate({
      genres: ["Horror"],
      semantics: semantics(["funny"]),
    });

    const ctx: ScoringContext = { genre: "horror", mood: "dark" };

    const signalsBoth = computeSignals(both, ctx);
    const signalsGenreOnly = computeSignals(genreOnly, ctx);

    assert.equal(signalsBoth.genreFit, 1);
    assert.equal(signalsBoth.moodFit, 1);
    assert.equal(signalsGenreOnly.genreFit, 1);
    assert.equal(signalsGenreOnly.moodFit, 0);

    assert.ok(
      scoreCandidate(both, ctx).total > scoreCandidate(genreOnly, ctx).total,
      "matching both dimensions must outrank matching only one"
    );
  });
});

// ---------------------------------------------------------------------------
// No genre / no mood
// ---------------------------------------------------------------------------

describe("scoring — no genre or mood in the request", () => {
  it("keeps both fit signals neutral", () => {
    const signals = computeSignals(candidate(), NO_DIMS);
    assert.equal(signals.genreFit, 0.5);
    assert.equal(signals.moodFit, 0.5);
  });

  it("still scores deterministically and keeps metadata-rich items ahead", () => {
    const rich = candidate({
      voteAverage: 8.0,
      voteCount: 2000,
      popularity: 300,
      genres: ["Horror", "Thriller"],
      semantics: semantics(["dark"]),
    });
    const sparse = candidate({
      voteAverage: 6.0,
      voteCount: 10,
      popularity: 2,
      genres: [],
      semantics: null,
    });

    const a = scoreCandidate(rich, NO_DIMS);
    const b = scoreCandidate(sparse, NO_DIMS);

    assert.ok(inRange(a.total) && inRange(b.total));
    assert.ok(a.total > b.total);
  });
});

// ---------------------------------------------------------------------------
// Missing AI metadata
// ---------------------------------------------------------------------------

describe("scoring — missing AI metadata", () => {
  it("ranks an enriched candidate above an identical unenriched one", () => {
    const enriched = candidate({ semantics: semantics(["dark"]) });
    const plain = candidate({ semantics: null });

    const ctx: ScoringContext = { genre: null, mood: "dark" };

    assert.equal(moodFitScore(enriched, ctx, DEFAULT_CFG), 1);
    assert.equal(moodFitScore(plain, ctx, DEFAULT_CFG), 0);
    assert.equal(discoverabilityScore(enriched), 1);
    assert.equal(discoverabilityScore(plain), 0.5);

    assert.ok(scoreCandidate(enriched, ctx).total > scoreCandidate(plain, ctx).total);
  });

  it("still produces valid in-range scores for unenriched candidates", () => {
    const signals = computeSignals(candidate({ semantics: null }), { genre: null, mood: "dark" });
    for (const value of Object.values(signals)) {
      assert.ok(inRange(value));
    }
  });
});

// ---------------------------------------------------------------------------
// Missing optional metadata
// ---------------------------------------------------------------------------

describe("scoring — missing optional metadata", () => {
  it("handles a candidate with almost nothing to work with", () => {
    const ghost = candidate({
      voteAverage: null,
      voteCount: null,
      popularity: null,
      releaseDate: null,
      genres: [],
      semantics: null,
    });

    const signals = computeSignals(ghost, NO_DIMS);

    assert.equal(signals.quality, 0.5);
    assert.equal(signals.voteConfidence, 0);
    assert.equal(signals.popularity, 0.5);
    assert.equal(signals.recency, 0.5);
    assert.equal(signals.genreFit, 0.5);
    assert.equal(signals.moodFit, 0.5);
    assert.equal(signals.discoverability, 0);
    assert.equal(signals.metadataConfidence, 0);

    const { total } = scoreCandidate(ghost, NO_DIMS);
    assert.ok(inRange(total));
    assert.ok(total > 0.37 && total < 0.38, `expected ~0.375, got ${total}`);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("scoring — determinism", () => {
  it("identical inputs always produce identical scores", () => {
    const c = candidate({
      genres: ["Horror"],
      semantics: semantics(["dark"]),
    });
    const ctx: ScoringContext = { genre: "horror", mood: "dark" };

    const first = scoreCandidate(c, ctx, FIXED_REF_CONFIG);
    const second = scoreCandidate(c, ctx, FIXED_REF_CONFIG);

    assert.deepEqual(first, second);
  });

  it("rankPool order is stable across identical pools", () => {
    const candidates = [
      candidate({ tmdbId: 2, title: "B", voteAverage: 8.0, voteCount: 1000 }),
      candidate({ tmdbId: 1, title: "A", voteAverage: 6.0, voteCount: 100 }),
      candidate({ tmdbId: 3, title: "C", voteAverage: 7.5, voteCount: 500 }),
    ];
    const p = pool({ genre: "horror", mood: null }, candidates);

    const first = rankPool(p, FIXED_REF_CONFIG).map((s) => s.candidate.tmdbId);
    const second = rankPool(p, FIXED_REF_CONFIG).map((s) => s.candidate.tmdbId);

    assert.deepEqual(first, second);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe("scoring — configuration", () => {
  it("merges partial configs over the defaults", () => {
    const cfg = resolveScoringConfig({ weights: { quality: 0.5 } });
    assert.equal(cfg.weights.quality, 0.5);
    assert.equal(cfg.weights.recency, DEFAULT_SCORING_CONFIG.weights.recency);
    assert.equal(cfg.vote.maxRating, DEFAULT_SCORING_CONFIG.vote.maxRating);
  });

  it("weights are honored: a recency-heavy config flips the old-vs-recent order", () => {
    const oldClassic = candidate({
      tmdbId: 1,
      releaseDate: "1975-06-20",
      voteAverage: 8.8,
      voteCount: 8000,
      popularity: 30,
      genres: ["Horror"],
    });
    const recentMeh = candidate({
      tmdbId: 2,
      releaseDate: "2025-06-20",
      voteAverage: 6.0,
      voteCount: 200,
      popularity: 90,
      genres: ["Horror"],
    });

    const ctx: ScoringContext = { genre: "horror", mood: null };

    const recencyHeavy: DeepPartial<ScoringConfig> = {
      weights: {
        quality: 0.2,
        recency: 0.8,
        voteConfidence: 0,
        genreFit: 0,
        moodFit: 0,
        popularity: 0,
        discoverability: 0,
        metadataConfidence: 0,
      },
    };

    const def = scoreCandidate(oldClassic, ctx, FIXED_REF_CONFIG);
    const heavy = scoreCandidate(recentMeh, ctx, { ...FIXED_REF_CONFIG, ...recencyHeavy });

    assert.ok(heavy.total > def.total, "recency-heavy config should favor the recent title");
  });

  it("scores with zero total weight gracefully", () => {
    const zero: DeepPartial<ScoringConfig> = {
      weights: {
        quality: 0,
        voteConfidence: 0,
        genreFit: 0,
        moodFit: 0,
        popularity: 0,
        recency: 0,
        discoverability: 0,
        metadataConfidence: 0,
      },
    };
    assert.equal(scoreCandidate(candidate(), NO_DIMS, zero).total, 0);
  });
});

// ---------------------------------------------------------------------------
// Pool ranking
// ---------------------------------------------------------------------------

describe("scoring — rankPool", () => {
  it("sorts candidates by descending score", () => {
    const candidates = [
      candidate({ tmdbId: 2, title: "B", voteAverage: 8.0, voteCount: 1000 }),
      candidate({ tmdbId: 1, title: "A", voteAverage: 6.0, voteCount: 100 }),
      candidate({ tmdbId: 3, title: "C", voteAverage: 7.5, voteCount: 500 }),
    ];
    const p = pool({ genre: "horror", mood: null }, candidates);

    const ranked = rankPool(p, FIXED_REF_CONFIG);

    assert.equal(ranked[0].candidate.tmdbId, 2);
    assert.equal(ranked[1].candidate.tmdbId, 3);
    assert.equal(ranked[2].candidate.tmdbId, 1);
    assert.ok(ranked[0].score.total >= ranked[1].score.total);
    assert.ok(ranked[1].score.total >= ranked[2].score.total);
  });

  it("breaks ties deterministically by ascending tmdbId", () => {
    const identical = candidate({ voteAverage: 7.0, voteCount: 500 });
    const candidates = [
      { ...identical, tmdbId: 9, title: "Nine" },
      { ...identical, tmdbId: 3, title: "Three" },
    ];
    const p = pool({ genre: null, mood: null }, candidates);

    const ranked = rankPool(p, FIXED_REF_CONFIG);

    assert.equal(ranked[0].candidate.tmdbId, 3);
    assert.equal(ranked[1].candidate.tmdbId, 9);
  });

  it("drives context from the pool request", () => {
    const matching = candidate({
      tmdbId: 1,
      genres: ["Horror"],
      semantics: semantics(["dark"]),
    });
    const notMood = candidate({
      tmdbId: 2,
      genres: ["Horror"],
      semantics: semantics(["funny"]),
    });
    const p = pool({ genre: "horror", mood: "dark" }, [matching, notMood]);

    const ranked = rankPool(p, FIXED_REF_CONFIG);

    assert.equal(ranked[0].candidate.tmdbId, 1, "matching both dimensions ranks first");
  });
});

// ---------------------------------------------------------------------------
// Signal range property
// ---------------------------------------------------------------------------

describe("scoring — normalization", () => {
  it("keeps every signal and the total in [0, 1]", () => {
    const samples = [
      candidate(),
      candidate({ voteAverage: null, voteCount: null, popularity: null, releaseDate: null }),
      candidate({ voteAverage: 9.9, voteCount: 999999, popularity: 9999 }),
      candidate({ voteAverage: 0.1, voteCount: 1, popularity: 0.01 }),
      candidate({ genres: [], semantics: semantics(["dark"]) }),
      candidate({ genres: [], semantics: null }),
    ];

    for (const c of samples) {
      for (const ctx of [
        NO_DIMS,
        { genre: "horror", mood: null },
        { genre: null, mood: "dark" },
        { genre: "horror", mood: "dark" },
      ]) {
        const signals = computeSignals(c, ctx, FIXED_REF_CONFIG);
        for (const value of Object.values(signals)) {
          assert.ok(inRange(value), `signal out of range: ${value}`);
        }
        const { total } = scoreCandidate(c, ctx, FIXED_REF_CONFIG);
        assert.ok(inRange(total), `total out of range: ${total}`);
      }
    }
  });
});
