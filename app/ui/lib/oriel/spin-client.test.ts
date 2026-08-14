// Spin API client mapping tests (node:test, run with tsx).
//
// Exercises the isolated seam between the Spin mechanism UI and
// /api/oriel/spin: response mapping (with defensive fallbacks), URL building,
// and error surfacing. No network is touched — fetch is injected as a stub.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  fetchSpin,
  mapSpinResponse,
  spinImageUrl,
  type SpinApiSuccessDto,
} from "./spin-client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function payload(candidates: SpinApiSuccessDto["candidates"] = []): SpinApiSuccessDto {
  return {
    ok: true,
    request: { genre: "Horror", mood: null, mediaType: null, limit: 20 },
    count: candidates.length,
    candidates,
  };
}

function candidate(
  overrides: Partial<SpinApiSuccessDto["candidates"][number]["candidate"]> = {}
) {
  return {
    candidate: {
      mediaType: "movie",
      tmdbId: 603692,
      title: "The Shining",
      releaseDate: "1980-05-23",
      voteAverage: 8.4,
      voteCount: 16000,
      popularity: 60,
      genres: ["Horror", "Thriller"],
      posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      backdropPath: null,
      overview: "A caretaker is slowly driven insane.",
      runtime: 146,
      ...overrides,
    } as SpinApiSuccessDto["candidates"][number]["candidate"],
    score: { total: 0.83 },
  };
}

// ---------------------------------------------------------------------------
// mapSpinResponse
// ---------------------------------------------------------------------------

describe("mapSpinResponse", () => {
  it("maps a Spin candidate to the UI shape", () => {
    const candidates = mapSpinResponse(payload([candidate()]));

    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0], {
      id: 603692,
      title: "The Shining",
      image: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      year: "1980",
      runtime: 146,
      rating: 8.4,
      genres: ["Horror", "Thriller"],
      overview: "A caretaker is slowly driven insane.",
      mediaType: "movie",
    });
  });

  it("maps TV candidates with their mediaType preserved", () => {
    const candidates = mapSpinResponse(
      payload([
        candidate({
          mediaType: "tv",
          tmdbId: 5,
          title: "Dark",
          genres: ["Science Fiction"],
        }),
      ])
    );

    assert.equal(candidates[0]?.mediaType, "tv");
    assert.deepEqual(candidates[0]?.genres, ["Science Fiction"]);
  });

  it("falls back to backdrop when poster is missing", () => {
    const candidates = mapSpinResponse(
      payload([candidate({ posterPath: null, backdropPath: "/backdrop.jpg" })])
    );

    assert.equal(
      candidates[0]?.image,
      "https://image.tmdb.org/t/p/w780/backdrop.jpg"
    );
  });

  it("falls back to a placeholder when no image path exists", () => {
    const candidates = mapSpinResponse(
      payload([candidate({ posterPath: null, backdropPath: null })])
    );

    assert.equal(candidates[0]?.image, spinImageUrl(null));
    assert.ok(candidates[0]?.image.startsWith("data:image/svg+xml"));
  });

  it("handles a missing release date with a null year", () => {
    const candidates = mapSpinResponse(payload([candidate({ releaseDate: null })]));

    assert.equal(candidates[0]?.year, null);
  });

  it("returns an empty list for an empty result set", () => {
    assert.deepEqual(mapSpinResponse(payload([])), []);
  });

  it("returns an empty list for an error payload instead of throwing", () => {
    assert.deepEqual(mapSpinResponse({ ok: false, errors: ["boom"] }), []);
    assert.deepEqual(mapSpinResponse(null), []);
    assert.deepEqual(mapSpinResponse("nonsense"), []);
  });

  it("skips malformed result entries without throwing", () => {
    const candidates = mapSpinResponse(
      payload([candidate(), { candidate: null, score: {} } as never])
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.title, "The Shining");
  });
});

// ---------------------------------------------------------------------------
// fetchSpin
// ---------------------------------------------------------------------------

describe("fetchSpin", () => {
  function stubFetch(status: number, body: unknown) {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    return { fetcher, calls };
  }

  it("builds the Spin URL from genre + mood + mediaType + limit", async () => {
    const { fetcher, calls } = stubFetch(200, payload([candidate()]));

    await fetchSpin(
      { genre: "Horror", mood: "dark", mediaType: "tv", limit: 20 },
      fetcher
    );

    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url, "http://localhost");
    assert.equal(url.pathname, "/api/oriel/spin");
    assert.equal(url.searchParams.get("genre"), "Horror");
    assert.equal(url.searchParams.get("mood"), "dark");
    assert.equal(url.searchParams.get("mediaType"), "tv");
    assert.equal(url.searchParams.get("limit"), "20");
    assert.deepEqual(calls[0].init, { cache: "no-store" });
  });

  it("omits empty filters and a 'both' mediaType from the URL", async () => {
    const { fetcher, calls } = stubFetch(200, payload());

    await fetchSpin({ mediaType: "both", limit: 20 }, fetcher);

    assert.equal(calls[0].url, "/api/oriel/spin?limit=20");
  });

  it("requests no query string when every filter is empty", async () => {
    const { fetcher, calls } = stubFetch(200, payload());

    await fetchSpin({}, fetcher);

    assert.equal(calls[0].url, "/api/oriel/spin");
  });

  it("returns mapped candidates on success", async () => {
    const { fetcher } = stubFetch(200, payload([candidate()]));

    const candidates = await fetchSpin({ genre: "Horror" }, fetcher);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.title, "The Shining");
  });

  it("throws when the API responds with an error status", async () => {
    const { fetcher } = stubFetch(500, { ok: false, errors: ["boom"] });

    await assert.rejects(
      () => fetchSpin({ genre: "Horror" }, fetcher),
      /Spin request failed: 500/
    );
  });

  it("returns an empty list for an ok:false 200 body", async () => {
    const { fetcher } = stubFetch(200, { ok: false, errors: ["boom"] });

    const candidates = await fetchSpin({ genre: "Horror" }, fetcher);

    assert.deepEqual(candidates, []);
  });
});
