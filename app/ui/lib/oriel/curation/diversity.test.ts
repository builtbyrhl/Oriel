// Diversity / re-ranking tests (node:test, run with tsx loader).
//
// `diversify` is PURE: it consumes scored candidates and a config and returns
// a reordered subset. These tests construct scored candidates directly and
// assert on the resulting order — no database, no AI provider.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DIVERSITY_CONFIG,
  diversify,
  resolveDiversityConfig,
  semanticSimilarity,
} from "./diversity";
import { buildDiversePool } from "./compose";
import type { DiversityConfig } from "./diversity";
import type { ScoredCandidate, ScoreBreakdown, ScoringConfig } from "./scoring";
import type {
  CandidatePool,
  CandidateSemantics,
  DeepPartial,
  DiscoveryCandidate,
} from "./types";
import type { SemanticFields } from "../../ai/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let seq = 1;

function candidate(
  overrides: Partial<DiscoveryCandidate> = {}
): DiscoveryCandidate {
  const tmdbId = overrides.tmdbId ?? seq;
  if (overrides.tmdbId === undefined) seq += 1;

  return {
    mediaType: "movie",
    tmdbId,
    title: `Movie ${tmdbId}`,
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
  fields: Partial<SemanticFields>
): CandidateSemantics {
  return {
    version: 1,
    provider: "gemini",
    model: "gemini-test",
    fields: {
      moods: ["dark", "tense"],
      tone: "dark",
      pacing: "fast",
      themes: ["survival"],
      semantic_genres: ["Slasher"],
      intensity: 7,
      audience_descriptors: ["fans of horror"],
      ...fields,
    },
  };
}

const SLASHER = semantics({
  semantic_genres: ["Slasher"],
  moods: ["dark", "tense"],
  themes: ["survival"],
  tone: "dark",
  pacing: "fast",
});
const ROMCOM = semantics({
  semantic_genres: ["Romantic Comedy"],
  moods: ["funny", "light"],
  themes: ["romance"],
  tone: "warm",
  pacing: "moderate",
});
const SPACE_OPERA = semantics({
  semantic_genres: ["Space Opera"],
  moods: ["epic", "awe"],
  themes: ["frontier"],
  tone: "epic",
  pacing: "moderate",
});
const BODY_HORROR = semantics({
  semantic_genres: ["Body Horror"],
  moods: ["dark", "claustrophobic"],
  themes: ["transformation"],
  tone: "grim",
  pacing: "slow",
});
const COSMIC_HORROR = semantics({
  semantic_genres: ["Cosmic Horror"],
  moods: ["dark", "awe"],
  themes: ["existential"],
  tone: "cosmic",
  pacing: "slow",
});

function breakdown(total: number): ScoreBreakdown {
  return {
    total,
    signals: {
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
}

function scored(c: DiscoveryCandidate, total: number): ScoredCandidate {
  return { candidate: c, score: breakdown(total) };
}

const ids = (out: ScoredCandidate[]) => out.map((s) => s.candidate.tmdbId);

// ---------------------------------------------------------------------------
// Repeated Horror types are reduced
// ---------------------------------------------------------------------------

describe("diversity — repeated Horror types are reduced", () => {
  it("surfaces a different type while keeping the top-relevance entry", () => {
    const h1 = candidate({ tmdbId: 1, semantics: SLASHER });
    const h2 = candidate({ tmdbId: 2, semantics: SLASHER });
    const h3 = candidate({ tmdbId: 3, semantics: SLASHER });
    const d = candidate({ tmdbId: 4, semantics: ROMCOM });

    const out = diversify(
      [scored(h1, 0.9), scored(h2, 0.85), scored(h3, 0.8), scored(d, 0.7)],
      { targetSize: 3 }
    );

    assert.deepEqual(ids(out), [1, 4, 2]);
  });

  it("does not collapse a genuinely varied horror pool", () => {
    const s = candidate({ tmdbId: 1, semantics: SLASHER });
    const b = candidate({ tmdbId: 2, semantics: BODY_HORROR });
    const c = candidate({ tmdbId: 3, semantics: COSMIC_HORROR });

    const out = diversify(
      [scored(s, 0.9), scored(b, 0.85), scored(c, 0.8)],
      { targetSize: 3 }
    );

    assert.equal(out.length, 3);
    assert.ok(new Set(ids(out)).size === 3, "all three distinct subgenres kept");
  });
});

// ---------------------------------------------------------------------------
// Different semantic types are surfaced
// ---------------------------------------------------------------------------

describe("diversity — different semantic types are surfaced", () => {
  it("promotes distinct types over near-duplicates within the window", () => {
    const s1 = candidate({ tmdbId: 1, semantics: SLASHER });
    const s2 = candidate({ tmdbId: 2, semantics: SLASHER });
    const c1 = candidate({ tmdbId: 3, semantics: ROMCOM });
    const f1 = candidate({ tmdbId: 4, semantics: SPACE_OPERA });

    const out = diversify(
      [scored(s1, 0.9), scored(s2, 0.85), scored(c1, 0.8), scored(f1, 0.75)],
      { targetSize: 3 }
    );

    assert.deepEqual(ids(out), [1, 3, 4]);
  });
});

// ---------------------------------------------------------------------------
// High relevance still dominates
// ---------------------------------------------------------------------------

describe("diversity — high relevance still dominates", () => {
  it("never promotes a poor candidate solely for being different", () => {
    const a = candidate({ tmdbId: 1, semantics: ROMCOM });
    const b = candidate({ tmdbId: 2, semantics: ROMCOM });
    const poor = candidate({ tmdbId: 3, semantics: SLASHER });

    const input = [scored(a, 0.9), scored(b, 0.85), scored(poor, 0.3)];

    for (const lambda of [0.05, 0.5, 0.95]) {
      const out = diversify(input, { targetSize: 2, lambda });
      assert.deepEqual(
        ids(out),
        [1, 2],
        `lambda=${lambda}: a poor candidate must not be promoted`
      );
    }
  });

  it("keeps the highest-relevance candidate first", () => {
    const a = candidate({ tmdbId: 1, semantics: ROMCOM });
    const b = candidate({ tmdbId: 2, semantics: ROMCOM });
    const c = candidate({ tmdbId: 3, semantics: SLASHER });

    const out = diversify(
      [scored(c, 0.8), scored(b, 0.9), scored(a, 0.7)],
      { targetSize: 3 }
    );

    assert.equal(out[0].candidate.tmdbId, 2, "top relevance leads the list");
  });
});

// ---------------------------------------------------------------------------
// Genre + mood remains respected
// ---------------------------------------------------------------------------

describe("diversity — genre + mood remains respected", () => {
  it("only reorders within the genre+mood intersection", () => {
    const g1 = candidate({ tmdbId: 1, genres: ["Horror"], semantics: SLASHER });
    const g2 = candidate({ tmdbId: 2, genres: ["Horror"], semantics: BODY_HORROR });
    const g3 = candidate({ tmdbId: 3, genres: ["Horror"], semantics: COSMIC_HORROR });

    const input = [scored(g1, 0.9), scored(g2, 0.85), scored(g3, 0.7)];

    const out = diversify(input, { targetSize: 2 });

    assert.equal(out.length, 2);
    assert.equal(out[0].candidate.tmdbId, 1);
    for (const s of out) {
      assert.ok(s.candidate.genres.includes("Horror"), "genre still respected");
      assert.ok(
        s.candidate.semantics?.fields.moods.includes("dark"),
        "mood still respected"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Missing AI metadata
// ---------------------------------------------------------------------------

describe("diversity — missing AI metadata", () => {
  it("treats unenriched candidates as neutrally similar", () => {
    const a = candidate({ tmdbId: 1, semantics: SLASHER });
    const b = candidate({ tmdbId: 2, semantics: ROMCOM });
    const plain = candidate({ tmdbId: 3, semantics: null });

    const out = diversify([scored(a, 0.9), scored(b, 0.85), scored(plain, 0.6)], {
      targetSize: 2,
    });

    assert.deepEqual(ids(out), [1, 2], "enriched distinct type beats the unknown");
    assert.equal(semanticSimilarity(a, plain), 0.5);
    assert.equal(semanticSimilarity(plain, plain), 0.5);
  });

  it("handles a pool with no semantic metadata at all", () => {
    const p1 = candidate({ tmdbId: 1, semantics: null });
    const p2 = candidate({ tmdbId: 2, semantics: null });
    const p3 = candidate({ tmdbId: 3, semantics: null });

    const out = diversify([scored(p1, 0.9), scored(p2, 0.85), scored(p3, 0.7)], {
      targetSize: 2,
    });

    assert.deepEqual(ids(out), [1, 2], "falls back to relevance order");
  });
});

// ---------------------------------------------------------------------------
// Duplicate movies
// ---------------------------------------------------------------------------

describe("diversity — duplicate movies", () => {
  it("deduplicates by tmdbId keeping the higher-scoring entry", () => {
    const dupLow = candidate({ tmdbId: 7, title: "Dup", semantics: SLASHER });
    const dupHigh = candidate({ tmdbId: 7, title: "Dup", semantics: SLASHER });
    const other = candidate({ tmdbId: 8, semantics: ROMCOM });

    const out = diversify(
      [scored(dupLow, 0.8), scored(dupHigh, 0.9), scored(other, 0.85)],
      { targetSize: 2 }
    );

    const resultIds = ids(out);
    assert.equal(new Set(resultIds).size, resultIds.length, "no duplicates");
    assert.deepEqual([...resultIds].sort(), [7, 8]);
    assert.equal(
      out.find((s) => s.candidate.tmdbId === 7)?.score.total,
      0.9,
      "higher-scoring duplicate kept"
    );
  });
});

// ---------------------------------------------------------------------------
// Deterministic output
// ---------------------------------------------------------------------------

describe("diversity — deterministic output", () => {
  it("identical inputs produce identical selections", () => {
    const h1 = candidate({ tmdbId: 1, semantics: SLASHER });
    const h2 = candidate({ tmdbId: 2, semantics: SLASHER });
    const d = candidate({ tmdbId: 3, semantics: ROMCOM });

    const input = [scored(h1, 0.9), scored(h2, 0.85), scored(d, 0.7)];
    const config = { targetSize: 2, lambda: 0.6 };

    assert.deepEqual(diversify(input, config), diversify(input, config));
  });
});

// ---------------------------------------------------------------------------
// Configurable diversity strength
// ---------------------------------------------------------------------------

describe("diversity — configurable diversity strength", () => {
  it("lambda near 1 favors relevance, lambda near 0 favors variety", () => {
    const h1 = candidate({ tmdbId: 1, semantics: SLASHER });
    const h2 = candidate({ tmdbId: 2, semantics: SLASHER });
    const d = candidate({ tmdbId: 3, semantics: ROMCOM });

    const input = [scored(h1, 0.9), scored(h2, 0.85), scored(d, 0.7)];

    const relevanceFirst = diversify(input, { targetSize: 2, lambda: 0.95 });
    const diverseFirst = diversify(input, { targetSize: 2, lambda: 0.1 });

    assert.deepEqual(ids(relevanceFirst), [1, 2]);
    assert.deepEqual(ids(diverseFirst), [1, 3]);
  });

  it("merges partial configs over the defaults", () => {
    const cfg = resolveDiversityConfig({ targetSize: 5 });
    assert.equal(cfg.targetSize, 5);
    assert.equal(cfg.lambda, DEFAULT_DIVERSITY_CONFIG.lambda);
    assert.equal(cfg.categories.semanticGenres, DEFAULT_DIVERSITY_CONFIG.categories.semanticGenres);
  });

  it("clamps out-of-range knobs", () => {
    const cfg = resolveDiversityConfig({
      lambda: 1.5,
      minRelevanceRatio: -1,
      windowMultiplier: 0.5,
    });
    assert.equal(cfg.lambda, 1);
    assert.equal(cfg.minRelevanceRatio, 0);
    assert.equal(cfg.windowMultiplier, 1);
  });
});

// ---------------------------------------------------------------------------
// Small candidate pools
// ---------------------------------------------------------------------------

describe("diversity — small candidate pools", () => {
  it("returns fewer items when the pool is smaller than the target", () => {
    const a = candidate({ tmdbId: 1, semantics: SLASHER });
    const b = candidate({ tmdbId: 2, semantics: ROMCOM });

    assert.deepEqual(ids(diversify([scored(a, 0.9), scored(b, 0.8)], { targetSize: 5 })), [1, 2]);
  });

  it("handles a single candidate", () => {
    const a = candidate({ tmdbId: 1, semantics: SLASHER });
    assert.deepEqual(ids(diversify([scored(a, 0.9)], { targetSize: 3 })), [1]);
  });

  it("handles an empty pool", () => {
    assert.deepEqual(diversify([], { targetSize: 3 }), []);
  });

  it("handles a target size of zero", () => {
    const a = candidate({ tmdbId: 1, semantics: SLASHER });
    assert.deepEqual(diversify([scored(a, 0.9)], { targetSize: 0 }), []);
  });

  it("handles a target size of one", () => {
    const a = candidate({ tmdbId: 1, semantics: SLASHER });
    const b = candidate({ tmdbId: 2, semantics: ROMCOM });
    assert.deepEqual(ids(diversify([scored(a, 0.9), scored(b, 0.8)], { targetSize: 1 })), [1]);
  });
});

// ---------------------------------------------------------------------------
// Content-based similarity (no hard-coded subgenres)
// ---------------------------------------------------------------------------

describe("diversity — content-based similarity", () => {
  it("does not hard-code subgenre labels", () => {
    const typeX = semantics({
      semantic_genres: ["Slasher"],
      moods: ["dark"],
      themes: ["survival"],
      tone: "dark",
      pacing: "fast",
    });
    const typeY = semantics({
      semantic_genres: ["Cosmic Horror"],
      moods: ["light"],
      themes: ["romance"],
      tone: "warm",
      pacing: "slow",
    });

    const a1 = candidate({ tmdbId: 1, semantics: typeX });
    const a2 = candidate({ tmdbId: 2, semantics: typeX });
    const b1 = candidate({ tmdbId: 3, semantics: typeY });
    const b2 = candidate({ tmdbId: 4, semantics: typeY });

    assert.equal(semanticSimilarity(a1, a2), 1);
    assert.equal(semanticSimilarity(b1, b2), 1);
    assert.equal(semanticSimilarity(a1, b1), 0);
  });

  it("weights partial mood overlap below a full match", () => {
    const full = semantics({
      semantic_genres: ["Slasher"],
      moods: ["dark", "tense"],
      themes: ["survival"],
      tone: "dark",
      pacing: "fast",
    });
    const partial = semantics({
      semantic_genres: ["Slasher"],
      moods: ["dark", "claustrophobic"],
      themes: ["survival"],
      tone: "dark",
      pacing: "fast",
    });
    const none = semantics({
      semantic_genres: ["Romantic Comedy"],
      moods: ["funny", "light"],
      themes: ["romance"],
      tone: "warm",
      pacing: "moderate",
    });

    const a = candidate({ tmdbId: 1, semantics: full });
    const b = candidate({ tmdbId: 2, semantics: partial });
    const c = candidate({ tmdbId: 3, semantics: none });

    const partialSim = semanticSimilarity(a, b);
    const noSim = semanticSimilarity(a, c);

    assert.ok(partialSim > 0 && partialSim < 1);
    assert.equal(noSim, 0);
  });
});

// ---------------------------------------------------------------------------
// End-to-end composition (scoring + diversity)
// ---------------------------------------------------------------------------

describe("diversity — end-to-end buildDiversePool", () => {
  it("ranks then diversifies a real candidate pool", () => {
    const h1 = candidate({
      tmdbId: 1,
      title: "High Horror",
      releaseDate: "1975-06-20",
      voteAverage: 8.8,
      voteCount: 8000,
      popularity: 30,
      genres: ["Horror"],
      semantics: SLASHER,
    });
    const h2 = candidate({
      tmdbId: 2,
      title: "High Horror 2",
      releaseDate: "1975-06-20",
      voteAverage: 8.5,
      voteCount: 7000,
      popularity: 30,
      genres: ["Horror"],
      semantics: SLASHER,
    });
    const h3 = candidate({
      tmdbId: 3,
      title: "High Horror 3",
      releaseDate: "1975-06-20",
      voteAverage: 8.0,
      voteCount: 5000,
      popularity: 30,
      genres: ["Horror"],
      semantics: SLASHER,
    });
    const d = candidate({
      tmdbId: 4,
      title: "Horror Romcom",
      releaseDate: "2024-06-20",
      voteAverage: 6.0,
      voteCount: 800,
      popularity: 40,
      genres: ["Horror", "Romance"],
      semantics: ROMCOM,
    });

    const pool: CandidatePool = {
      request: { genre: "horror", mood: null, mediaType: null, limit: 10 },
      count: 4,
      candidates: [h1, h2, h3, d],
    };

    const scoringConfig: DeepPartial<ScoringConfig> = {
      recency: { referenceDate: "2026-01-01" },
    };
    const diversityConfig: DeepPartial<DiversityConfig> = { targetSize: 2 };

    const out = buildDiversePool(pool, scoringConfig, diversityConfig);

    assert.equal(out.length, 2);
    assert.equal(out[0].candidate.tmdbId, 1, "top relevance stays first");
    assert.equal(out[1].candidate.tmdbId, 4, "different type surfaces second");
  });

  it("is deterministic across identical pools", () => {
    const a = candidate({
      tmdbId: 1,
      releaseDate: "2019-01-01",
      voteAverage: 7.5,
      voteCount: 3000,
      popularity: 60,
      genres: ["Horror"],
      semantics: SLASHER,
    });
    const b = candidate({
      tmdbId: 2,
      releaseDate: "2023-01-01",
      voteAverage: 7.0,
      voteCount: 1500,
      popularity: 40,
      genres: ["Horror"],
      semantics: ROMCOM,
    });

    const pool: CandidatePool = {
      request: { genre: "horror", mood: null, mediaType: null, limit: 10 },
      count: 2,
      candidates: [a, b],
    };

    const config = { recency: { referenceDate: "2026-01-01" } };
    const first = buildDiversePool(pool, config, { targetSize: 2 });
    const second = buildDiversePool(pool, config, { targetSize: 2 });

    assert.deepEqual(first, second);
  });
});
