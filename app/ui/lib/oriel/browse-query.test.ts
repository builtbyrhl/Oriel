// Browse page state isolation tests (node:test, run with tsx).
//
// Proves that Spin's exploration intent (genre/mood) is local to Spin and can
// never move Rhythm's content: changing Spin's genre/mood must leave Rhythm's
// query untouched, while Spin's own request still carries the exact values.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SPIN_INTENT,
  RHYTHM_EDITORIAL_MOOD,
  RHYTHM_LIMIT,
  SPIN_LIMIT,
  buildRhythmQuery,
  buildSpinQuery,
} from "./browse-query";
import { fetchSpin, type SpinApiSuccessDto } from "./spin-client";
import { fetchDiscovery, type DiscoveryApiSuccessDto } from "./discovery-client";

// ---------------------------------------------------------------------------
// Rhythm is independent of Spin
// ---------------------------------------------------------------------------

describe("Spin/Rhythm state isolation", () => {
  it("keeps Spin's initial genre (Drama) out of Rhythm's query", () => {
    const rhythm = buildRhythmQuery("movie");

    assert.equal(DEFAULT_SPIN_INTENT.genre, "Drama");
    assert.equal(rhythm.genre, undefined);
    assert.notEqual(rhythm.mood, undefined);
  });

  it("changing Spin's genre does not affect Rhythm", () => {
    const before = buildRhythmQuery("movie");

    buildSpinQuery({ genre: "Horror" }, "movie");

    assert.deepEqual(buildRhythmQuery("movie"), before);
  });

  it("changing Spin's mood does not affect Rhythm", () => {
    const before = buildRhythmQuery("movie");

    buildSpinQuery({ genre: "Drama", mood: "tense" }, "movie");

    assert.deepEqual(buildRhythmQuery("movie"), before);
  });

  it("changing both Spin genre and mood does not affect Rhythm", () => {
    const before = buildRhythmQuery("tv");

    buildSpinQuery({ genre: "Comedy", mood: "funny" }, "movie");

    assert.deepEqual(buildRhythmQuery("tv"), before);
  });

  it("keeps Rhythm's query a fixed editorial baseline for any media scope", () => {
    for (const mediaType of ["movie", "tv"] as const) {
      assert.deepEqual(buildRhythmQuery(mediaType), {
        mood: RHYTHM_EDITORIAL_MOOD,
        mediaType,
        limit: RHYTHM_LIMIT,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Spin still carries its intent correctly
// ---------------------------------------------------------------------------

describe("Spin intent", () => {
  it("builds the Spin query from genre + mood + mediaType + limit", () => {
    assert.deepEqual(
      buildSpinQuery({ genre: "Horror", mood: "tense" }, "tv"),
      { genre: "Horror", mood: "tense", mediaType: "tv", limit: SPIN_LIMIT }
    );
  });

  it("forwards only the dimensions the user set", () => {
    assert.deepEqual(buildSpinQuery({ genre: "Comedy" }, "movie"), {
      genre: "Comedy",
      mood: undefined,
      mediaType: "movie",
      limit: SPIN_LIMIT,
    });
  });

  it("defaults Spin to a valid Drama intent on first paint", () => {
    assert.deepEqual(DEFAULT_SPIN_INTENT, { genre: "Drama" });
    assert.equal(buildSpinQuery(DEFAULT_SPIN_INTENT, "movie").genre, "Drama");
  });

  it("sends the exact intent in the Spin request parameters", async () => {
    const calls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({
          ok: true,
          request: {
            genre: "Horror",
            mood: "tense",
            mediaType: "movie",
            limit: SPIN_LIMIT,
          },
          count: 0,
          candidates: [],
        } satisfies SpinApiSuccessDto),
        { status: 200 }
      );
    }) as typeof fetch;

    await fetchSpin(buildSpinQuery({ genre: "Horror", mood: "tense" }, "movie"), fetcher);

    assert.equal(calls.length, 1);
    const url = new URL(calls[0], "http://localhost");
    assert.equal(url.pathname, "/api/oriel/spin");
    assert.equal(url.searchParams.get("genre"), "Horror");
    assert.equal(url.searchParams.get("mood"), "tense");
    assert.equal(url.searchParams.get("mediaType"), "movie");
    assert.equal(url.searchParams.get("limit"), String(SPIN_LIMIT));
  });

  it("keeps the Rhythm request free of Spin parameters on the wire", async () => {
    const calls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({
          ok: true,
          request: {
            genre: null,
            mood: RHYTHM_EDITORIAL_MOOD,
            mediaType: "movie",
            limit: RHYTHM_LIMIT,
          },
          count: 0,
          results: [],
        } satisfies DiscoveryApiSuccessDto),
        { status: 200 }
      );
    }) as typeof fetch;

    await fetchDiscovery(buildRhythmQuery("movie"), fetcher);

    assert.equal(calls.length, 1);
    const url = new URL(calls[0], "http://localhost");
    assert.equal(url.pathname, "/api/oriel/discovery");
    assert.equal(url.searchParams.get("genre"), null);
    assert.equal(url.searchParams.get("mood"), RHYTHM_EDITORIAL_MOOD);
    assert.equal(url.searchParams.get("mediaType"), "movie");
    assert.equal(url.searchParams.get("limit"), String(RHYTHM_LIMIT));
  });
});
