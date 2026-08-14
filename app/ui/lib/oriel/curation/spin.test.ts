// Spin exploration engine tests (node:test, run with tsx)
//
// These cover the Spin spec's full surface: genre/mood independence and
// intersection, media scoping, relevance-first ordering, the semantic
// redundancy penalty, the quality floor, determinism, configurable size,
// duplicate handling (including cross-type tmdbId collisions), degraded pools
// (empty / too small / no AI metadata), and the guarantee that the existing
// scoring and discovery behavior is untouched.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildSpinSet } from "./spin";
import type { SpinConfig, SpinSuccessBody } from "./spin";
import { buildCandidatePool, resolveDiscoveryRequest } from "./discovery";
import { rankPool } from "./scoring";
import type { DeepPartial, DiscoveryCandidateRow } from "./types";
import type { SemanticFields } from "../../ai/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fields(overrides: Partial<SemanticFields> = {}): SemanticFields {
  return {
    moods: ["dark"],
    tone: "somber",
    pacing: "slow",
    themes: ["isolation"],
    semantic_genres: ["dread"],
    intensity: 6,
    audience_descriptors: ["mature"],
    ...overrides,
  };
}

function row(
  id: number,
  overrides: Partial<DiscoveryCandidateRow> = {}
): DiscoveryCandidateRow {
  return {
    media_type: "movie",
    tmdb_id: id,
    title: `Film ${id}`,
    release_date: "2024-05-14",
    vote_average: 7.5,
    vote_count: 600,
    popularity: 90,
    genres: ["Horror"],
    version: 1,
    provider: "gemini",
    model: "gemini-2.5-pro",
    fields: fields(),
    ...overrides,
  };
}

// Simulates the discovery RPC's filtering (genre AND mood = intersection,
// mediaType scoping, row cap) so the engine contract is exercised end to end.
function simulateGateway(rows: DiscoveryCandidateRow[]) {
  return {
    async fetchCandidates(opts: {
      genre: string | null;
      mood: string | null;
      mediaType: "movie" | "tv" | null;
      limit: number;
    }): Promise<DiscoveryCandidateRow[]> {
      let out = rows;

      if (opts.genre) {
        const needle = opts.genre.toLowerCase();
        out = out.filter((r) =>
          (r.genres ?? []).some((g) => g.toLowerCase() === needle)
        );
      }

      if (opts.mood) {
        const needle = opts.mood.toLowerCase();
        out = out.filter((r) => {
          const moods = (r.fields as SemanticFields | null)?.moods ?? [];
          return moods.some((m) => m.toLowerCase() === needle);
        });
      }

      if (opts.mediaType === "movie" || opts.mediaType === "tv") {
        out = out.filter((r) => r.media_type === opts.mediaType);
      }

      return out.slice(0, opts.limit);
    },
  };
}

async function spin(
  request: Parameters<typeof buildSpinSet>[0],
  rows: DiscoveryCandidateRow[],
  options: { config?: DeepPartial<SpinConfig> } = {}
): Promise<SpinSuccessBody> {
  const db = simulateGateway(rows);
  const result = await buildSpinSet(request, { deps: { db }, ...options });
  assert.equal(
    result.ok,
    true,
    `expected success, got ${JSON.stringify((result as { errors?: string[] }).errors ?? "")}`
  );
  return result as SpinSuccessBody;
}

const titles = (result: SpinSuccessBody): string[] =>
  result.candidates.map((s) => s.candidate.title);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildSpinSet", () => {
  describe("validation", () => {
    it("requires genre or mood", async () => {
      const result = await buildSpinSet({} as never, {
        deps: { db: simulateGateway([]) },
      });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.ok((result as { errors: string[] }).errors.some((e) => /genre or mood/.test(e)));
    });

    it("rejects invalid mediaType", async () => {
      const result = await buildSpinSet(
        { genre: "Horror", mediaType: "book" } as never,
        { deps: { db: simulateGateway([]) } }
      );
      assert.equal(result.ok, false);
    });
  });

  describe("filters", () => {
    it("filters by genre", async () => {
      const rows = [
        row(1, { genres: ["Horror"], title: "Horror A" }),
        row(2, { genres: ["Horror"], title: "Horror B" }),
        row(3, { genres: ["Comedy"], title: "Comedy Film" }),
      ];
      const result = await spin({ genre: "Horror", limit: 5 }, rows);
      const t = titles(result);
      assert.ok(!t.includes("Comedy Film"));
      assert.ok(t.length >= 1);
    });

    it("filters by mood via the stored semantic envelope", async () => {
      const rows = [
        row(1, { fields: fields({ moods: ["funny", "light"] }), title: "Funny Film" }),
        row(2, { fields: fields({ moods: ["sad"] }), title: "Sad Film" }),
      ];
      const result = await spin({ mood: "funny", limit: 5 }, rows);
      const t = titles(result);
      assert.ok(t.includes("Funny Film"));
      assert.ok(!t.includes("Sad Film"));
    });

    it("genre + mood behave as an intersection, never OR", async () => {
      const rows = [
        row(1, { genres: ["Horror"], fields: fields({ moods: ["dark"] }), title: "Dark Horror" }),
        row(2, { genres: ["Horror"], fields: fields({ moods: ["funny"] }), title: "Funny Horror" }),
        row(3, { genres: ["Comedy"], fields: fields({ moods: ["funny"] }), title: "Funny Comedy" }),
      ];
      const result = await spin({ genre: "Horror", mood: "funny", limit: 5 }, rows);
      assert.deepEqual(titles(result), ["Funny Horror"]);
    });

    it("scopes to movies only", async () => {
      const rows = [
        row(1, { media_type: "movie", title: "Movie A" }),
        row(2, { media_type: "tv", title: "Show B" }),
      ];
      const result = await spin({ genre: "Horror", mediaType: "movie", limit: 5 }, rows);
      assert.ok(result.candidates.every((s) => s.candidate.mediaType === "movie"));
    });

    it("scopes to TV only", async () => {
      const rows = [
        row(1, { media_type: "movie", title: "Movie A" }),
        row(2, { media_type: "tv", title: "Show B" }),
      ];
      const result = await spin({ genre: "Horror", mediaType: "tv", limit: 5 }, rows);
      assert.ok(result.candidates.every((s) => s.candidate.mediaType === "tv"));
    });
  });

  describe("ordering", () => {
    it("puts the strongest candidate first", async () => {
      const envelope = fields({ moods: ["dark"], themes: ["isolation"], tone: "somber", pacing: "slow" });
      const rows = [
        row(1, { title: "Strong Film", vote_average: 8.5, vote_count: 10000, popularity: 500, fields: envelope }),
        row(2, { title: "Weak Film", vote_average: 5.5, vote_count: 200, popularity: 40, fields: envelope }),
      ];
      const result = await spin({ genre: "Horror", limit: 2 }, rows);
      assert.equal(result.count, 2);
      assert.equal(result.candidates[0].candidate.title, "Strong Film");
    });

    it("penalizes semantic redundancy (same envelope not promoted for variety)", async () => {
      const duplicate = fields({ moods: ["dark"], themes: ["isolation"], tone: "somber", pacing: "slow", semantic_genres: ["dread"] });
      const distinct = fields({ moods: ["bright"], themes: ["reunion"], tone: "warm", pacing: "fast", semantic_genres: ["uplifting"] });
      const rows = [
        row(1, { title: "Anchor", vote_average: 8.0, vote_count: 800, popularity: 100, fields: duplicate }),
        row(2, { title: "Copycat", vote_average: 7.9, vote_count: 700, popularity: 90, fields: duplicate }),
        row(3, { title: "Fresh", vote_average: 7.5, vote_count: 500, popularity: 80, fields: distinct }),
      ];
      const result = await spin({ genre: "Horror", limit: 2 }, rows);
      assert.deepEqual(titles(result), ["Anchor", "Fresh"]);
    });

    it("keeps genuinely different categories side by side", async () => {
      const rows = [
        row(1, { title: "Dark One", fields: fields({ moods: ["dark"] }) }),
        row(2, { title: "Funny One", fields: fields({ moods: ["funny"] }) }),
        row(3, { title: "Romantic One", fields: fields({ moods: ["romantic"] }) }),
      ];
      const result = await spin({ genre: "Horror", limit: 3 }, rows);
      const moods = result.candidates.map(
        (s) => s.candidate.semantics?.fields.moods[0]
      );
      assert.deepEqual(new Set(moods), new Set(["dark", "funny", "romantic"]));
    });
  });

  describe("quality floor", () => {
    it("excludes terrible candidates even when the set is undersized", async () => {
      const rows = [
        row(1, { title: "Good A", vote_average: 7.5, vote_count: 500, popularity: 100 }),
        row(2, { title: "Good B", vote_average: 8.0, vote_count: 600, popularity: 110 }),
        row(3, { title: "Terrible Film", vote_average: 1.5, vote_count: 3, popularity: 5 }),
      ];
      const result = await spin({ genre: "Horror", limit: 10 }, rows);
      const t = titles(result);
      assert.ok(!t.includes("Terrible Film"), "quality floor must never be lowered");
      assert.equal(result.count, 2);
    });
  });

  describe("degraded pools", () => {
    it("does not crash when AI metadata is missing", async () => {
      const rows = [
        row(1, { title: "Enriched", fields: fields() }),
        row(2, { title: "Bare", fields: null }),
      ];
      const result = await spin({ genre: "Horror", limit: 5 }, rows);
      assert.ok(result.count >= 1);
    });

    it("returns an empty set for an empty pool", async () => {
      const result = await spin({ genre: "Horror", limit: 5 }, []);
      assert.equal(result.count, 0);
      assert.deepEqual(result.candidates, []);
    });

    it("returns fewer results than requested instead of padding", async () => {
      const rows = [row(1, { title: "One" }), row(2, { title: "Two" })];
      const result = await spin({ genre: "Horror", limit: 5 }, rows);
      assert.equal(result.count, 2);
    });
  });

  describe("determinism", () => {
    it("produces identical results for identical inputs", async () => {
      const rows = Array.from({ length: 10 }, (_, i) =>
        row(100 + i, {
          title: `Film ${i + 1}`,
          vote_average: 7 + (i % 3) * 0.3,
          fields: fields(i % 2 === 0 ? { moods: ["dark"] } : { moods: ["tense"] }),
        })
      );
      const r1 = await spin({ genre: "Horror", limit: 5 }, rows);
      const r2 = await spin({ genre: "Horror", limit: 5 }, rows);
      assert.deepEqual(r1.candidates, r2.candidates);
    });
  });

  describe("configurable size", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      row(1000 + i, {
        title: `Horror ${i + 1}`,
        vote_average: 7 + (i % 10) * 0.1,
        vote_count: 500 + i * 10,
        popularity: 80 + i,
        fields: fields(i % 2 === 0 ? { moods: ["dark"] } : { moods: ["tense"] }),
      })
    );

    it("defaults to 20 results when no limit is given", async () => {
      const result = await spin({ genre: "Horror" }, many);
      assert.equal(result.count, 20);
    });

    it("honors config.resultSize when the request has no limit", async () => {
      const result = await spin({ genre: "Horror" }, many, { config: { resultSize: 4 } });
      assert.equal(result.count, 4);
    });

    it("lets a request-level limit override config", async () => {
      const result = await spin(
        { genre: "Horror", limit: 3 },
        many,
        { config: { resultSize: 8, poolMultiplier: 3 } }
      );
      assert.equal(result.count, 3);
    });
  });

  describe("duplicate handling", () => {
    it("never emits duplicate ids, keeping the higher-scored row", async () => {
      const rows = [
        row(5, { title: "Movie 5 v1", vote_average: 8, vote_count: 1000 }),
        row(5, { title: "Movie 5 v2", vote_average: 5, vote_count: 100 }),
        row(9, { title: "Movie 9", vote_average: 7, vote_count: 500 }),
      ];
      const result = await spin({ genre: "Horror", limit: 10 }, rows);
      const t = titles(result);
      assert.ok(t.includes("Movie 5 v1"));
      assert.ok(!t.includes("Movie 5 v2"));
      const ids = result.candidates.map((s) => s.candidate.tmdbId);
      assert.equal(new Set(ids).size, ids.length);
    });

    it("collapses cross-type tmdbId collisions to the strongest entry", async () => {
      const rows = [
        row(42, { media_type: "movie", title: "Movie 42", vote_average: 8, vote_count: 1000 }),
        row(42, { media_type: "tv", title: "Show 42", vote_average: 6, vote_count: 100 }),
        row(7, { media_type: "movie", title: "Movie 7", vote_average: 7, vote_count: 500 }),
      ];
      const result = await spin({ genre: "Horror", mediaType: "both", limit: 10 }, rows);
      const t = titles(result);
      assert.ok(t.includes("Movie 42"));
      assert.ok(!t.includes("Show 42"));
      const ids = result.candidates.map((s) => s.candidate.tmdbId);
      assert.equal(new Set(ids).size, ids.length);
    });
  });

  describe("existing behavior is preserved", () => {
    it("rankPool still ranks strictly by score with tmdbId tie-breaks", async () => {
      const rows = [
        row(2, { vote_average: 7, vote_count: 500 }),
        row(1, { vote_average: 8, vote_count: 600 }),
      ];
      const db = simulateGateway(rows);
      const pool = await buildCandidatePool({ genre: "Horror", limit: 10 }, { db });
      assert.equal(pool.ok, true);
      if (!pool.ok) return;
      const ranked = rankPool(pool.pool);
      assert.equal(ranked[0].candidate.tmdbId, 1);
      assert.ok(ranked[0].score.total >= ranked[1].score.total);
    });

    it("resolveDiscoveryRequest still enforces the genre-or-mood contract", () => {
      assert.equal(resolveDiscoveryRequest({}).ok, false);
      assert.equal(resolveDiscoveryRequest({ genre: "Horror" }).ok, true);
    });
  });
});
