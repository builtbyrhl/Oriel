// Oriel Discovery API route/integration tests (node:test, run with tsx).
//
// Exercises the real HTTP handler (`createDiscoveryHandler`) end to end: query
// parsing → validation → buildCandidatePool → rankPool → diversify → JSON.
// The data layer is a faithful in-memory DiscoveryDbGateway reproducing the
// SQL intersection semantics, so no live database or AI is touched.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { createDiscoveryHandler } from "@/app/api/oriel/discovery/route";
import type { DiscoveryDbGateway, DiscoveryCandidateRow } from "./types";
import type { SemanticFields } from "../../ai/types";
import type { DiscoveryApiSuccessBody } from "./discovery-api";

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

type Call = { genre: string | null; mood: string | null; mediaType: string | null; limit: number };

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

async function get(query: string, gateway: DiscoveryDbGateway) {
  const handler = createDiscoveryHandler({ db: gateway });
  const res = await handler(new NextRequest(`http://localhost/api/oriel/discovery?${query}`));
  return { res, body: (await res.json()) as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe("Oriel Discovery API — genre only", () => {
  it("returns horror titles when genre=Horror", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror", gateway);

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);

    const success = body as unknown as DiscoveryApiSuccessBody;
    assert.deepEqual(success.request, {
      genre: "Horror",
      mood: null,
      mediaType: null,
      limit: 50,
    });

    assert.ok(success.results.length > 0, "should surface horror candidates");
    for (const { candidate } of success.results) {
      assert.ok(
        candidate.genres.some((g) => g.toLowerCase() === "horror"),
        `${candidate.title} must be a horror title`
      );
    }
    assert.equal(calls[0]?.genre, "Horror");
    assert.equal(calls[0]?.mood, null);
  });
});

describe("Oriel Discovery API — mood only", () => {
  it("returns dark-mood titles when mood=dark", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("mood=dark", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;
    assert.deepEqual(success.request, {
      genre: null,
      mood: "dark",
      mediaType: null,
      limit: 50,
    });

    assert.ok(success.results.length > 0);
    for (const { candidate } of success.results) {
      assert.ok(
        candidate.genres.length > 0,
        `${candidate.title} matched by mood alone`
      );
    }
    assert.equal(calls[0]?.genre, null);
    assert.equal(calls[0]?.mood, "dark");
  });
});

describe("Oriel Discovery API — genre + mood", () => {
  it("intersects the filters (both must match)", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror&mood=dark", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;

    assert.deepEqual(success.request, {
      genre: "Horror",
      mood: "dark",
      mediaType: null,
      limit: 50,
    });

    assert.equal(success.results.length, 1);
    assert.equal(success.results[0].candidate.tmdbId, 1);
    assert.equal(success.results[0].candidate.title, "The Shining");
    assert.deepEqual(calls[0], {
      genre: "Horror",
      mood: "dark",
      mediaType: null,
      limit: 50,
    });
  });
});

describe("Oriel Discovery API — mediaType scoping", () => {
  it("returns only movies for mediaType=movie", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Horror&mediaType=movie", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;

    assert.equal(success.request.mediaType, "movie");
    assert.ok(success.results.length > 0);
    for (const { candidate } of success.results) {
      assert.equal(candidate.mediaType, "movie");
    }
  });

  it("returns only TV for mediaType=tv", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("mediaType=tv&genre=Comedy", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;

    assert.equal(success.request.mediaType, "tv");
    assert.equal(success.results.length, 1);
    assert.equal(success.results[0].candidate.title, "Barry");
    assert.equal(calls[0]?.mediaType, "tv");
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("Oriel Discovery API — no filters", () => {
  it("returns a 400 when neither genre nor mood is provided", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("", gateway);

    assert.equal(res.status, 400);
    assert.equal(body.ok, false);
    assert.ok(
      (body.errors as string[]).some((e) => /genre or mood/.test(e)),
      "should explain that genre or mood is required"
    );
    assert.equal(calls.length, 0, "invalid requests must not touch the data layer");
  });
});

describe("Oriel Discovery API — invalid parameters", () => {
  it("rejects an unknown mediaType", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror&mediaType=book", gateway);

    assert.equal(res.status, 400);
    assert.equal(body.ok, false);
    assert.match((body.errors as string[]).join(" "), /mediaType must be one of/);
    assert.equal(calls.length, 0);
  });

  it("rejects a non-numeric limit", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Horror&limit=abc", gateway);

    assert.equal(res.status, 400);
    assert.match((body.errors as string[]).join(" "), /limit must be a whole number/);
  });

  it("rejects a zero and an oversized limit", async () => {
    for (const limit of ["0", "500"]) {
      const { gateway } = makeGateway();
      const { res, body } = await get(`genre=Horror&limit=${limit}`, gateway);
      assert.equal(res.status, 400, `limit=${limit} must be rejected`);
      assert.match((body.errors as string[]).join(" "), /limit must be between 1 and 200/);
    }
  });

  it("rejects an empty genre", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=", gateway);

    assert.equal(res.status, 400);
    assert.match((body.errors as string[]).join(" "), /genre must be a non-empty string/);
    assert.equal(calls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// No results / limit handling
// ---------------------------------------------------------------------------

describe("Oriel Discovery API — no results", () => {
  it("returns an empty 200 with count 0 when nothing matches", async () => {
    const { gateway } = makeGateway();
    const { res, body } = await get("genre=Romance", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;
    assert.equal(success.ok, true);
    assert.equal(success.request.genre, "Romance");
    assert.equal(success.count, 0);
    assert.deepEqual(success.results, []);
  });
});

describe("Oriel Discovery API — limit handling", () => {
  it("caps the number of results at limit", async () => {
    const { gateway, calls } = makeGateway();
    const { res, body } = await get("genre=Horror&limit=2", gateway);

    assert.equal(res.status, 200);
    const success = body as unknown as DiscoveryApiSuccessBody;

    assert.equal(success.request.limit, 2);
    assert.equal(success.results.length, 2);
    assert.equal(calls[0]?.limit, 2);
  });

  it("applies the default limit of 50 when none is provided", async () => {
    const { gateway, calls } = makeGateway();
    const { res } = await get("genre=Horror", gateway);

    assert.equal(res.status, 200);
    assert.equal(calls[0]?.limit, 50);
  });
});

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

describe("Oriel Discovery API — response shape", () => {
  it("exposes candidate identity + score, without the AI envelope", async () => {
    const { gateway } = makeGateway();
    const { body } = await get("genre=Horror", gateway);

    const success = body as unknown as DiscoveryApiSuccessBody;
    const first = success.results[0];

    assert.deepEqual(Object.keys(success).sort(), ["count", "ok", "request", "results"]);
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
      "popularity",
      "posterPath",
      "releaseDate",
      "title",
      "tmdbId",
      "voteAverage",
      "voteCount",
    ]);
    assert.equal("semantics" in first.candidate, false, "AI envelope stays out of the API");
    assert.equal(first.candidate.posterPath, null, "image paths default to null");
    assert.equal(first.candidate.backdropPath, null);

    assert.equal(typeof first.score.total, "number");
    assert.ok(
      first.score.total >= 0 && first.score.total <= 1,
      "score must be normalized to [0, 1]"
    );
    assert.deepEqual(Object.keys(first.score.signals).sort(), [
      "discoverability",
      "genreFit",
      "metadataConfidence",
      "moodFit",
      "popularity",
      "quality",
      "recency",
      "voteConfidence",
    ]);
  });
});
