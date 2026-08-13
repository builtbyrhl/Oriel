// Discovery API client mapping tests (node:test, run with tsx).
//
// Exercises the isolated seam between the Browse UI and /api/oriel/discovery:
// response mapping (with defensive fallbacks) and URL building. No network is
// touched — fetch is injected as a stub.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  discoveryImageUrl,
  fetchDiscovery,
  mapDiscoveryResponse,
  type DiscoveryApiSuccessDto,
} from "./discovery-client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function payload(
  results: DiscoveryApiSuccessDto["results"] = []
): DiscoveryApiSuccessDto {
  return {
    ok: true,
    request: { genre: "Horror", mood: null, mediaType: null, limit: 20 },
    count: results.length,
    results,
  };
}

function result(
  overrides: Partial<DiscoveryApiSuccessDto["results"][number]["candidate"]> = {}
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
      ...overrides,
    } as DiscoveryApiSuccessDto["results"][number]["candidate"],
    score: { total: 0.83, signals: {} },
  };
}

// ---------------------------------------------------------------------------
// mapDiscoveryResponse
// ---------------------------------------------------------------------------

describe("mapDiscoveryResponse", () => {
  it("maps a curated result to the UI Movie shape", () => {
    const movies = mapDiscoveryResponse(payload([result()]));

    assert.equal(movies.length, 1);
    assert.deepEqual(movies[0], {
      id: 603692,
      title: "The Shining",
      genre: "Horror",
      year: "1980",
      image: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      contentType: "movie",
    });
  });

  it("maps TV candidates to series content type", () => {
    const movies = mapDiscoveryResponse(
      payload([
        result({
          mediaType: "tv",
          tmdbId: 5,
          title: "Dark",
          genres: ["Science Fiction"],
        }),
      ])
    );

    assert.equal(movies[0]?.contentType, "series");
    assert.equal(movies[0]?.genre, "Science Fiction");
  });

  it("falls back to backdrop when poster is missing", () => {
    const movies = mapDiscoveryResponse(
      payload([
        result({
          posterPath: null,
          backdropPath: "/backdrop.jpg",
        }),
      ])
    );

    assert.equal(
      movies[0]?.image,
      "https://image.tmdb.org/t/p/w780/backdrop.jpg"
    );
  });

  it("falls back to a placeholder when no image path exists", () => {
    const movies = mapDiscoveryResponse(
      payload([result({ posterPath: null, backdropPath: null })])
    );

    assert.equal(movies[0]?.image, discoveryImageUrl(null));
    assert.ok(movies[0]?.image.startsWith("data:image/svg+xml"));
  });

  it("handles a missing release date with an empty year", () => {
    const movies = mapDiscoveryResponse(
      payload([result({ releaseDate: null })])
    );

    assert.equal(movies[0]?.year, "");
  });

  it("returns an empty list for an empty result set", () => {
    assert.deepEqual(mapDiscoveryResponse(payload([])), []);
  });

  it("returns an empty list for an error payload instead of throwing", () => {
    assert.deepEqual(
      mapDiscoveryResponse({ ok: false, errors: ["boom"] }),
      []
    );
    assert.deepEqual(mapDiscoveryResponse(null), []);
    assert.deepEqual(mapDiscoveryResponse("nonsense"), []);
  });

  it("skips malformed result entries without throwing", () => {
    const movies = mapDiscoveryResponse(
      payload([result(), { candidate: null, score: {} } as never])
    );

    assert.equal(movies.length, 1);
    assert.equal(movies[0]?.title, "The Shining");
  });
});

// ---------------------------------------------------------------------------
// fetchDiscovery
// ---------------------------------------------------------------------------

describe("fetchDiscovery", () => {
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

  it("builds the discovery URL from genre + mood + mediaType + limit", async () => {
    const { fetcher, calls } = stubFetch(200, payload([result()]));

    await fetchDiscovery(
      { genre: "Horror", mood: "dark", mediaType: "tv", limit: 20 },
      fetcher
    );

    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url, "http://localhost");
    assert.equal(url.pathname, "/api/oriel/discovery");
    assert.equal(url.searchParams.get("genre"), "Horror");
    assert.equal(url.searchParams.get("mood"), "dark");
    assert.equal(url.searchParams.get("mediaType"), "tv");
    assert.equal(url.searchParams.get("limit"), "20");
    assert.deepEqual(calls[0].init, { cache: "no-store" });
  });

  it("omits empty filters and a 'both' mediaType from the URL", async () => {
    const { fetcher, calls } = stubFetch(200, payload());

    await fetchDiscovery({ mediaType: "both", limit: 20 }, fetcher);

    assert.equal(calls[0].url, "/api/oriel/discovery?limit=20");
  });

  it("requests no query string when every filter is empty", async () => {
    const { fetcher, calls } = stubFetch(200, payload());

    await fetchDiscovery({}, fetcher);

    assert.equal(calls[0].url, "/api/oriel/discovery");
  });

  it("returns mapped movies on success", async () => {
    const { fetcher } = stubFetch(200, payload([result()]));

    const movies = await fetchDiscovery({ genre: "Horror" }, fetcher);

    assert.equal(movies.length, 1);
    assert.equal(movies[0]?.title, "The Shining");
  });

  it("throws when the API responds with an error status", async () => {
    const { fetcher } = stubFetch(500, { ok: false, errors: ["boom"] });

    await assert.rejects(
      () => fetchDiscovery({ genre: "Horror" }, fetcher),
      /Discovery request failed: 500/
    );
  });

  it("returns an empty list for an ok:false 200 body", async () => {
    const { fetcher } = stubFetch(200, { ok: false, errors: ["boom"] });

    const movies = await fetchDiscovery({ genre: "Horror" }, fetcher);

    assert.deepEqual(movies, []);
  });
});
