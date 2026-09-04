// Streaming provider registry tests (node:test, run with tsx).
//
// Locks in the reliability invariant: the default source served by `getStream`
// is always the lowest-ranked (most reliable) live provider — never the broken
// empty-URL stub that used to live at index 0. The ranked source list is also
// provably ordered and every movie/TV URL resolves to a non-empty HTTPS value.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getStream } from "./manager";
import {
  STREAM_PROVIDERS,
  buildProviderUrl,
  getRankedProviders,
  providerHas,
} from "./providers";
import type { StreamingProvider } from "./types";

describe("streaming provider registry", () => {
  it("ranks providers so the most reliable is first", () => {
    const ranked = getRankedProviders();
    const ranks = ranked.map((p) => p.rank);
    const sorted = [...ranks].sort((a, b) => a - b);
    assert.deepEqual(ranks, sorted);
    assert.equal(ranked[0].rank, 1);
  });

  it("has no provider resolving to an empty movie or TV URL", () => {
    for (const p of STREAM_PROVIDERS) {
      assert.ok(buildProviderUrl(p, 1, "movie"), `empty movie URL for ${p.name}`);
      assert.ok(buildProviderUrl(p, 1, "tv", 1, 1), `empty TV URL for ${p.name}`);
    }
  });

  it("getStream always selects the rank-1 provider by default", () => {
    const stream = getStream({ tmdbId: 603692, type: "movie" });
    assert.ok(stream.sources.length > 0);
    assert.equal(stream.provider, getRankedProviders()[0]!.name);
    assert.equal(stream.provider, "vidlink"); // rank 1
    assert.equal(stream.sources[0].provider, "vidlink");
    assert.ok(stream.url);
  });

  it("orders the overlay source list by reliability rank", () => {
    const stream = getStream({ tmdbId: 603692, type: "movie" });
    const ranks = stream.sources.map((s) => {
      const p = STREAM_PROVIDERS.find((q) => q.name === s.provider)!;
      return { provider: p.name, rank: p.rank };
    });
    const sorted = [...ranks].sort((a, b) => a.rank - b.rank).map((r) => r.provider);
    assert.deepEqual(ranks.map((r) => r.provider), sorted);
  });

  it("builds correctly-tokenised movie and TV URLs", () => {
    const vidlink = STREAM_PROVIDERS.find((p) => p.name === "vidlink") as StreamingProvider;
    assert.equal(
      buildProviderUrl(vidlink, 603704, "movie"),
      "https://vidlink.pro/movie/603704"
    );
    assert.equal(
      buildProviderUrl(vidlink, 603704, "tv", 2, 5),
      "https://vidlink.pro/tv/603704/2/5"
    );
  });

  it("reports availability per content type per provider", () => {
    const vidlink = STREAM_PROVIDERS.find((p) => p.name === "vidlink")!;
    assert.equal(providerHas("movie", vidlink), true);
    assert.equal(providerHas("tv", vidlink), true);
  });
});
