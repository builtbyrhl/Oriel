// Discovery candidate pool tests (node:test, run with tsx loader).
//
// The engine is dependency-injected: a faithful in-memory gateway reproduces
// the SQL intersection semantics (case-insensitive genre + mood, media-type
// scope, limit) so the tests assert the REQUEST → POOL behavior end to end
// without a live database.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildCandidatePool,
  DEFAULT_DISCOVERY_LIMIT,
  MAX_DISCOVERY_LIMIT,
  normalizeGenre,
  normalizeMood,
  parseDiscoveryRequest,
} from "./discovery";
import type {
  DiscoveryCandidateRow,
  DiscoveryDbGateway,
} from "./types";
import type { SemanticFields } from "../../ai/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DARK_HORROR: SemanticFields = {
  moods: ["dark", "tense", "gritty"],
  tone: "dark and grim",
  pacing: "fast",
  themes: ["survival"],
  semantic_genres: ["slasher"],
  intensity: 8,
  audience_descriptors: ["mature audiences"],
};

const LIGHT_COMEDY: SemanticFields = {
  moods: ["funny", "light", "playful"],
  tone: "warm and funny",
  pacing: "fast",
  themes: ["friendship"],
  semantic_genres: ["rom-com"],
  intensity: 3,
  audience_descriptors: ["fans of light comedy"],
};

const HOPEFUL_HORROR: SemanticFields = {
  moods: ["dark", "hopeful"],
  tone: "somber but hopeful",
  pacing: "moderate",
  themes: ["redemption"],
  semantic_genres: ["supernatural horror"],
  intensity: 6,
  audience_descriptors: ["fans of atmospheric horror"],
};

function movie(
  tmdbId: number,
  title: string,
  genres: string[],
  fields: SemanticFields | null
): DiscoveryCandidateRow {
  return {
    media_type: "movie",
    tmdb_id: tmdbId,
    title,
    release_date: "2024-05-14",
    vote_average: 7.1,
    vote_count: 500,
    popularity: 50,
    genres,
    version: fields ? 1 : null,
    provider: fields ? "gemini" : null,
    model: fields ? "gemini-3.5-flash" : null,
    fields: fields ? (fields as unknown) : null,
  };
}

function tv(
  tmdbId: number,
  title: string,
  genres: string[],
  fields: SemanticFields | null
): DiscoveryCandidateRow {
  return {
    media_type: "tv",
    tmdb_id: tmdbId,
    title,
    release_date: "2023-01-01",
    vote_average: 8.2,
    vote_count: 800,
    popularity: 80,
    genres,
    version: fields ? 1 : null,
    provider: fields ? "gemini" : null,
    model: fields ? "gemini-3.5-flash" : null,
    fields: fields ? (fields as unknown) : null,
  };
}

/**
 * In-memory gateway that mirrors the oriel_discovery_candidates SQL semantics:
 * media-type scope, case-insensitive genre AND case-insensitive mood, capped
 * by limit. Records gateway calls so tests can assert what was forwarded.
 */
function memoryGateway(rows: DiscoveryCandidateRow[]) {
  const calls: Array<{
    genre: string | null;
    mood: string | null;
    mediaType: "movie" | "tv" | null;
    limit: number;
  }> = [];

  const db: DiscoveryDbGateway = {
    async fetchCandidates({ genre, mood, mediaType, limit }) {
      calls.push({ genre, mood, mediaType, limit });

      let out = rows;

      if (mediaType) {
        out = out.filter((row) => row.media_type === mediaType);
      }

      if (genre) {
        const needle = genre.toLowerCase();
        out = out.filter((row) =>
          (row.genres ?? []).some((g) => g.toLowerCase() === needle)
        );
      }

      if (mood) {
        const needle = mood.toLowerCase();
        out = out.filter((row) => {
          const moods = (row.fields as { moods?: string[] } | null)?.moods ?? [];
          return moods.some((m) => m.toLowerCase() === needle);
        });
      }

      return out.slice(0, limit);
    },
  };

  return { db, calls };
}

// ---------------------------------------------------------------------------
// Genre only
// ---------------------------------------------------------------------------

describe("discovery — genre only", () => {
  it("matches candidates by genre with case-insensitive equality", async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Dark House", ["Horror", "Thriller"], DARK_HORROR),
      movie(2, "Fun Night", ["Comedy"], LIGHT_COMEDY),
      tv(3, "Creep Show", ["Horror"], DARK_HORROR),
    ]);

    const result = await buildCandidatePool({ genre: "horror" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.deepEqual(result.pool.candidates.map((c) => c.title), [
      "Dark House",
      "Creep Show",
    ]);
    assert.equal(result.pool.count, 2);
    assert.equal(calls[0].genre, "horror");
    assert.equal(calls[0].mood, null);
    assert.equal(calls[0].mediaType, null);
    assert.equal(calls[0].limit, DEFAULT_DISCOVERY_LIMIT);
  });

  it("normalizes common genre aliases (sci-fi -> Science Fiction)", async () => {
    const { db } = memoryGateway([
      movie(4, "Rings", ["Science Fiction"], DARK_HORROR),
      movie(5, "Laughs", ["Comedy"], LIGHT_COMEDY),
    ]);

    const result = await buildCandidatePool({ genre: "sci-fi" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.deepEqual(
      result.pool.candidates.map((c) => c.title),
      ["Rings"]
    );
  });

  it("returns candidates without semantic enrichment (semantics null)", async () => {
    const { db } = memoryGateway([
      movie(6, "Raw Footage", ["Horror"], null),
    ]);

    const result = await buildCandidatePool({ genre: "horror" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.pool.candidates[0].semantics, null);
    assert.equal(result.pool.candidates[0].genres.join(","), "Horror");
  });

  it("returns an empty pool for an unknown genre (valid request)", async () => {
    const { db, calls } = memoryGateway([movie(1, "A", ["Horror"], DARK_HORROR)]);

    const result = await buildCandidatePool({ genre: "documentary" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.count, 0);
    assert.equal(calls.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Mood only
// ---------------------------------------------------------------------------

describe("discovery — mood only", () => {
  it("matches candidates using the stored AI moods array", async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Dark House", ["Horror"], DARK_HORROR),
      movie(2, "Sunny", ["Comedy"], LIGHT_COMEDY),
      movie(7, "Unenriched Horror", ["Horror"], null),
    ]);

    const result = await buildCandidatePool({ mood: "dark" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.deepEqual(
      result.pool.candidates.map((c) => c.title),
      ["Dark House"]
    );
    assert.equal(calls[0].genre, null);
    assert.equal(calls[0].mood, "dark");
  });

  it("excludes media without semantic enrichment from mood queries", async () => {
    const { db } = memoryGateway([
      movie(7, "Unenriched Horror", ["Horror"], null),
    ]);

    const result = await buildCandidatePool({ mood: "dark" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.count, 0);
  });

  it("normalizes mood case and whitespace", async () => {
    assert.equal(normalizeMood("  TENSE "), "tense");
    const { db } = memoryGateway([
      movie(1, "Dark House", ["Horror"], DARK_HORROR),
    ]);

    const result = await buildCandidatePool({ mood: "  TENSE  " }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.count, 1);
  });
});

// ---------------------------------------------------------------------------
// Genre + mood intersection
// ---------------------------------------------------------------------------

describe("discovery — genre + mood intersection", () => {
  it("returns only candidates matching BOTH dimensions", async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Dark House", ["Horror"], DARK_HORROR), // horror + dark
      movie(2, "Fun Night", ["Comedy"], LIGHT_COMEDY), // not horror
      movie(3, "Eerie Laughs", ["Horror"], LIGHT_COMEDY), // horror but not dark
      tv(4, "Creep Show", ["Horror"], DARK_HORROR), // horror + dark (tv)
    ]);

    const result = await buildCandidatePool(
      { genre: "horror", mood: "dark" },
      { db }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.deepEqual(
      result.pool.candidates.map((c) => c.title),
      ["Dark House", "Creep Show"]
    );
    assert.equal(calls[0].genre, "horror");
    assert.equal(calls[0].mood, "dark");
  });

  it("never ORs the dimensions (disjoint pair yields an empty pool)", async () => {
    const { db } = memoryGateway([
      movie(1, "Dark House", ["Horror"], DARK_HORROR),
      movie(2, "Sunny", ["Comedy"], LIGHT_COMEDY),
    ]);

    const result = await buildCandidatePool(
      { genre: "comedy", mood: "dark" },
      { db }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.count, 0);
  });
});

// ---------------------------------------------------------------------------
// Movie vs TV filtering
// ---------------------------------------------------------------------------

describe("discovery — media type filtering", () => {
  it("scopes to movies only", async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Film", ["Horror"], DARK_HORROR),
      tv(2, "Series", ["Horror"], DARK_HORROR),
    ]);

    const result = await buildCandidatePool(
      { genre: "horror", mediaType: "movie" },
      { db }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.pool.candidates.map((c) => c.title), ["Film"]);
    assert.equal(calls[0].mediaType, "movie");
  });

  it("scopes to TV only", async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Film", ["Horror"], DARK_HORROR),
      tv(2, "Series", ["Horror"], DARK_HORROR),
    ]);

    const result = await buildCandidatePool(
      { genre: "horror", mediaType: "tv" },
      { db }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.pool.candidates.map((c) => c.title), ["Series"]);
    assert.equal(calls[0].mediaType, "tv");
  });

  it('treats "both" as no media-type filter (null)', async () => {
    const { db, calls } = memoryGateway([
      movie(1, "Film", ["Horror"], DARK_HORROR),
      tv(2, "Series", ["Horror"], DARK_HORROR),
    ]);

    const result = await buildCandidatePool(
      { genre: "horror", mediaType: "both" },
      { db }
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.candidates.length, 2);
    assert.equal(calls[0].mediaType, null);
  });
});

// ---------------------------------------------------------------------------
// Empty / invalid requests
// ---------------------------------------------------------------------------

describe("discovery — empty and invalid requests", () => {
  it("rejects a request with neither genre nor mood", async () => {
    const { db, calls } = memoryGateway([]);

    const result = await buildCandidatePool({}, { db });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /At least one of genre or mood/);
    assert.equal(calls.length, 0, "must not touch the data layer");
  });

  it("rejects a whitespace-only genre and mood", async () => {
    const { db, calls } = memoryGateway([]);

    const result = await buildCandidatePool({ genre: "  ", mood: "  " }, { db });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.length >= 1);
    assert.equal(calls.length, 0);
  });

  it("rejects an unknown mediaType", async () => {
    const result = await buildCandidatePool(
      { genre: "horror", mediaType: "album" as "both" },
      { db: memoryGateway([]).db }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /mediaType/);
  });

  it("rejects a zero limit", async () => {
    const result = await buildCandidatePool(
      { genre: "horror", limit: 0 },
      { db: memoryGateway([]).db }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /limit/);
  });

  it("rejects a non-integer limit", async () => {
    const result = await buildCandidatePool(
      { genre: "horror", limit: 2.5 },
      { db: memoryGateway([]).db }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /limit/);
  });

  it(`rejects a limit above ${MAX_DISCOVERY_LIMIT}`, async () => {
    const result = await buildCandidatePool(
      { genre: "horror", limit: MAX_DISCOVERY_LIMIT + 1 },
      { db: memoryGateway([]).db }
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /limit/);
  });
});

// ---------------------------------------------------------------------------
// Candidate limit
// ---------------------------------------------------------------------------

describe("discovery — candidate limit", () => {
  it("caps the returned pool size", async () => {
    const rows = [
      movie(1, "A", ["Horror"], DARK_HORROR),
      movie(2, "B", ["Horror"], DARK_HORROR),
      movie(3, "C", ["Horror"], DARK_HORROR),
    ];

    const { db, calls } = memoryGateway(rows);

    const result = await buildCandidatePool({ genre: "horror", limit: 2 }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.candidates.length, 2);
    assert.equal(result.pool.count, 2);
    assert.equal(calls[0].limit, 2);
  });

  it("applies the default limit when none is provided", async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      movie(i + 1, `M${i}`, ["Horror"], DARK_HORROR)
    );

    const { db, calls } = memoryGateway(rows);

    const result = await buildCandidatePool({ genre: "horror" }, { db });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pool.candidates.length, 10);
    assert.equal(calls[0].limit, DEFAULT_DISCOVERY_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// Request parsing (URL-style params)
// ---------------------------------------------------------------------------

describe("discovery — parseDiscoveryRequest", () => {
  it("parses genre + mood + mediaType + limit from query params", () => {
    const result = parseDiscoveryRequest({
      genre: "horror",
      mood: "dark",
      mediaType: "movie",
      limit: "25",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.request, {
      genre: "horror",
      mood: "dark",
      mediaType: "movie",
      limit: 25,
    });
  });

  it("parses a genre-only request with defaults", () => {
    const result = parseDiscoveryRequest({ genre: "sci-fi" });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.request, {
      genre: "Science Fiction",
      mood: null,
      mediaType: null,
      limit: DEFAULT_DISCOVERY_LIMIT,
    });
  });

  it("rejects non-string values", () => {
    const result = parseDiscoveryRequest({ genre: ["horror", "comedy"] });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /genre or mood/);
  });

  it("rejects a non-numeric limit instead of silently defaulting", () => {
    const result = parseDiscoveryRequest({ genre: "horror", limit: "abc" });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors[0], /limit must be a whole number/);
  });
});
