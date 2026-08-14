// Oriel Spin API route/integration tests (node:test, run with tsx).
//
// Exercises the real HTTP handler (`createSpinHandler`) end to end: query
// parsing → buildSpinSet → detail enrichment → JSON. The data layer is a
// faithful in-memory DiscoveryDbGateway reproducing the SQL intersection
// semantics, and detail lookups go to a stub gateway — no live database, no
// Supabase, no AI.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { createSpinHandler } from "@/app/api/oriel/spin/route";
import {
  detailsKey,
  type SpinApiSuccessBody,
  type SpinDetailsGateway,
} from "./spin-api";
import type { DiscoveryDbGateway, DiscoveryCandidateRow } from "./types";
import type { SemanticFields } from "../../ai/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fields(
  moods: string[],
  override: Partial<SemanticFields> = {}
): SemanticFields {
  return {
    moods,
    tone: "a test tone",
    pacing: "moderate",
    themes: ["a theme"],
    semantic_genres: ["a semantic genre"],
    intensity: 5,
    audience_descriptors: ["fans of tests"],
    ...override,
  };
}

function row(
  mediaType: "movie" | "tv",
  tmdbId: number,
  title: string,
  genres: string[],
  sem: SemanticFields
): DiscoveryCandidateRow {
  return {
    media_type: mediaType,
    tmdb_id: tmdbId,
    title,
    release_date: "2024-05-14",
    vote_average: 7.1,
    vote_count: 500,
    popularity: 50,
    genres,
    version: 1,
    provider: "gemini",
    model: "gemini-3.5-flash",
    fields: sem as unknown,
  };
}

const CATALOG: DiscoveryCandidateRow[] = [
  row("movie", 1, "The Shining", ["Horror", "Thriller"], fields(["dark", "tense"])),
  row("movie", 2, "Get Out", ["Horror", "Mystery"], fields(["tense", "funny"])),
  row("movie", 3, "Airplane!", ["Comedy"], fields(["funny", "light"])),
  row("movie", 4, "Blade Runner", ["Science Fiction", "Drama"], fields(["dark", "philosophical"])),
  row("tv", 5, "Dark", ["Science Fiction"], fields(["dark", "mysterious"])),
  row("tv", 6, "Barry", ["Comedy", "Drama"], fields(["funny", "dark"])),
  row("movie", 7, "A Quiet Place", ["Horror"], fields(["tense"])),
];

const DETAILS: Record<string, { overview: string | null; runtime: number | null }> = {
  "movie:1": { overview: "A caretaker is slowly driven insane.", runtime: 146 },
  "movie:2": { overview: "A weekend getaway goes wrong.", runtime: 104 },
  "movie:7": { overview: "Silence keeps them alive.", runtime: 90 },
};

type Call = {
  genre: string | null;
  mood: string | null;
  mediaType: string | null;
  limit: number;
};

function makeGateway(rows: DiscoveryCandidateRow[] = CATALOG) {
  const calls: Call[] = [];

  const gateway: DiscoveryDbGateway = {
    async fetchCandidates({ genre, mood, mediaType, limit }) {
      calls.push({ genre, mood, mediaType, limit });

      const matched = rows.filter((candidate) => {
        if (mediaType && candidate.media_type !== mediaType) return false;

        if (genre) {
          const hit = (candidate.genres ?? []).some(
            (g) => g.toLowerCase() === genre.toLowerCase()
          );
          if (!hit) return false;
        }

        if (mood) {
          const raw = candidate.fields as { moods?: unknown } | null;
          const moods = Array.isArray(raw?.moods) ? raw.moods : [];
          const hit = moods.some(
            (m) => String(m).toLowerCase() === mood.toLowerCase()
          );
          if (!hit) return false;
        }

        return true;
      });

      return matched.slice(0, limit);
    },
  };

  return { gateway, calls };
}

function makeDetails(records: Record<string, { overview: string | null; runtime: number | null }> = DETAILS) {
  const calls: Array<Array<{ mediaType: string; tmdbId: number }>> = [];

  const gateway: SpinDetailsGateway = {
    async fetchDetails(keys) {
      calls.push(keys.map(({ mediaType, tmdbId }) => ({ mediaType, tmdbId })));

      const found = new Map<string, { overview: string | null; runtime: number | null }>();
      for (const { mediaType, tmdbId } of keys) {
        const detail = records[detailsKey(mediaType as "movie" | "tv", tmdbId)];
        if (detail) found.set(detailsKey(mediaType as "movie" | "tv", tmdbId), detail);
      }
      return found;
    },
  };

  return { gateway, calls };
}

async function get(query: string, options: { db?: DiscoveryDbGateway; details?: SpinDetailsGateway } = {}) {
  const handler = createSpinHandler({ db: options.db, details: options.details });
  const res = await handler(new NextRequest(`http://localhost/api/oriel/spin?${query}`));
  return { res, body: (await res.json()) as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe("Oriel Spin API — genre only", () => {
  it("returns horror titles, enriched with details", async () => {
    const { gateway, calls } = makeGateway();
    const { gateway: details, calls: detailCalls } = makeDetails();
    const { res, body } = await get("genre=Horror", { db: gateway, details });

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);

    const success = body as unknown as SpinApiSuccessBody;
    assert.deepEqual(success.request, {
      genre: "Horror",
      mood: null,
      mediaType: null,
      limit: 50,
    });

    assert.ok(success.count > 0, "should surface horror candidates");
    for (const { candidate } of success.candidates) {
      assert.ok(
        candidate.genres.some((g) => g.toLowerCase() === "horror"),
        `${candidate.title} must be a horror title`
      );
    }

    // The engine fetches a larger pool than the result size for exploration.
    assert.equal(calls[0]?.genre, "Horror");
    assert.equal(calls[0]?.limit, 125);
    assert.equal(detailCalls.length, 1);
  });
});

describe("Oriel Spin API — genre + mood", () => {
  it("intersects the filters (both must match)", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Horror&mood=dark", { db: gateway });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;

    assert.deepEqual(success.request, {
      genre: "Horror",
      mood: "dark",
      mediaType: null,
      limit: 50,
    });

    assert.equal(success.count, 1);
    assert.equal(success.candidates[0].candidate.tmdbId, 1);
    assert.equal(success.candidates[0].candidate.title, "The Shining");
  });
});

describe("Oriel Spin API — mediaType scoping", () => {
  it("returns only movies for mediaType=movie", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Horror&mediaType=movie", { db: gateway });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;

    assert.equal(success.request.mediaType, "movie");
    assert.ok(success.count > 0);
    for (const { candidate } of success.candidates) {
      assert.equal(candidate.mediaType, "movie");
    }
  });

  it("returns only TV for mediaType=tv", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("mediaType=tv&genre=Comedy", { db: gateway });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;

    assert.equal(success.request.mediaType, "tv");
    assert.equal(success.count, 1);
    assert.equal(success.candidates[0].candidate.title, "Barry");
    assert.equal(calls[0]?.mediaType, "tv");
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("Oriel Spin API — no filters", () => {
  it("returns a 400 when neither genre nor mood is provided", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("", { db: gateway });

    assert.equal(res.status, 400);
    assert.equal(body.ok, false);
    assert.ok(
      (body.errors as string[]).some((e) => /genre or mood/.test(e)),
      "should explain that genre or mood is required"
    );
    assert.equal(calls.length, 0, "invalid requests must not touch the data layer");
  });
});

describe("Oriel Spin API — invalid parameters", () => {
  it("rejects an unknown mediaType", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror&mediaType=book", { db: gateway });

    assert.equal(res.status, 400);
    assert.match((body.errors as string[]).join(" "), /mediaType must be one of/);
    assert.equal(calls.length, 0);
  });

  it("rejects a non-numeric limit", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Horror&limit=abc", { db: gateway });

    assert.equal(res.status, 400);
    assert.match((body.errors as string[]).join(" "), /limit must be a whole number/);
  });

  it("rejects a zero and an oversized limit", async () => {
    for (const limit of ["0", "500"]) {
      const { gateway } = makeGateway();
      const { res, body } = await get(`genre=Horror&limit=${limit}`, { db: gateway });
      assert.equal(res.status, 400, `limit=${limit} must be rejected`);
      assert.match((body.errors as string[]).join(" "), /limit must be between 1 and 200/);
    }
  });
});

// ---------------------------------------------------------------------------
// Result size / limit handling
// ---------------------------------------------------------------------------

describe("Oriel Spin API — no results", () => {
  it("returns an empty 200 with count 0 when nothing matches", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Romance", { db: gateway });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;
    assert.equal(success.ok, true);
    assert.equal(success.request.genre, "Romance");
    assert.equal(success.count, 0);
    assert.deepEqual(success.candidates, []);
  });
});

describe("Oriel Spin API — limit handling", () => {
  it("caps the number of results at limit", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror&limit=2", { db: gateway });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;

    assert.equal(success.request.limit, 2);
    assert.ok(success.count <= 2);
    assert.equal(calls[0]?.limit, 5, "pool size scales with the result size");
  });

  it("applies the default result size of 50 when none is provided", async () => {
    const { gateway, calls } = makeGateway();
    const { res } = await get("genre=Horror", { db: gateway });

    assert.equal(res.status, 200);
    assert.equal(calls[0]?.limit, 125, "pool = ceil(50 * 2.5)");
  });
});

// ---------------------------------------------------------------------------
// Detail enrichment
// ---------------------------------------------------------------------------

describe("Oriel Spin API — detail enrichment", () => {
  it("attaches overview + runtime from the detail gateway", async () => {
    const { gateway } = makeGateway();
    const { gateway: details } = makeDetails();
    const { res, body } = await get("genre=Horror", { db: gateway, details });

    assert.equal(res.status, 200);
    const success = body as unknown as SpinApiSuccessBody;

    const byId = new Map(
      success.candidates.map(({ candidate }) => [candidate.tmdbId, candidate])
    );
    assert.equal(byId.get(1)?.overview, "A caretaker is slowly driven insane.");
    assert.equal(byId.get(1)?.runtime, 146);
  });

  it("degrades to null overview/runtime when the detail gateway throws", async () => {
    const { gateway } = makeGateway();
    const details: SpinDetailsGateway = {
      async fetchDetails() {
        throw new Error("details down");
      },
    };

    const { res, body } = await get("genre=Horror", { db: gateway, details });

    assert.equal(res.status, 200, "enrichment failure must not sink the request");
    const success = body as unknown as SpinApiSuccessBody;
    assert.ok(success.count > 0);
    for (const { candidate } of success.candidates) {
      assert.equal(candidate.overview, null);
      assert.equal(candidate.runtime, null);
    }
  });
});

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

describe("Oriel Spin API — response shape", () => {
  it("exposes candidate identity + score, with display fields", async () => {
    const { gateway } = makeGateway();
    const { body } = await get("genre=Horror", { db: gateway });

    const success = body as unknown as SpinApiSuccessBody;
    const first = success.candidates[0];

    assert.deepEqual(Object.keys(success).sort(), ["candidates", "count", "ok", "request"]);
    assert.deepEqual(Object.keys(success.request).sort(), [
      "genre",
      "limit",
      "mediaType",
      "mood",
    ]);
    assert.deepEqual(Object.keys(first.candidate).sort(), [
      "backdropPath",
      "genres",
      "mediaType",
      "overview",
      "popularity",
      "posterPath",
      "releaseDate",
      "runtime",
      "title",
      "tmdbId",
      "voteAverage",
      "voteCount",
    ]);
    assert.equal("semantics" in first.candidate, false, "AI envelope stays out of the API");

    assert.equal(typeof first.score.total, "number");
    assert.ok(
      first.score.total >= 0 && first.score.total <= 1,
      "score must be normalized to [0, 1]"
    );
  });

  it("is deterministic for identical requests", async () => {
    const { gateway } = makeGateway();
    const a = (await get("genre=Horror", { db: gateway })).body as unknown as SpinApiSuccessBody;
    const b = (await get("genre=Horror", { db: gateway })).body as unknown as SpinApiSuccessBody;

    assert.deepEqual(
      a.candidates.map(({ candidate }) => candidate.tmdbId),
      b.candidates.map(({ candidate }) => candidate.tmdbId)
    );
  });
});
