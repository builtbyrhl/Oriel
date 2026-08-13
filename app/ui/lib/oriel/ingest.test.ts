// Ingestion engine tests (node:test, run with tsx loader).
//
// The engine is dependency-injected, so these tests exercise the full
// discovery -> detail -> normalize -> validate -> upsert pipeline against
// mock TMDB and database gateways for both media types. No network or
// database calls are made.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runIngestion } from "./ingest";
import { normalizeMovieDetail, normalizeTvDetail } from "./normalize";
import { validateMovieRecord } from "./validate";
import type {
  MediaType,
  MovieDbGateway,
  OrielMediaRecord,
  TmdbGateway,
  TmdbMovieDetail,
  TmdbMovieSummary,
  TmdbTvDetail,
  TmdbTvSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOVIE_IDS = [1, 2, 3];
const TV_IDS = [101, 102, 103];

function summaryMovie(id: number, title = `Movie ${id}`): TmdbMovieSummary {
  return { id, title, original_language: "en" };
}

function summaryTv(id: number, name = `Show ${id}`): TmdbTvSummary {
  return { id, name, original_language: "en" };
}

function movieDetail(
  id: number,
  overrides: Partial<TmdbMovieDetail> = {}
): TmdbMovieDetail {
  return {
    id,
    title: `Movie ${id}`,
    original_language: "en",
    adult: false,
    video: false,
    ...overrides,
  };
}

function tvDetail(
  id: number,
  overrides: Partial<TmdbTvDetail> = {}
): TmdbTvDetail {
  return {
    id,
    name: `Show ${id}`,
    original_language: "en",
    ...overrides,
  };
}

/** Default gateway returning a healthy movie batch (ids 1,2,3) or TV batch (ids 101,102,103). */
function makeTmdb(overrides: Partial<TmdbGateway> = {}): TmdbGateway {
  const tmdb: TmdbGateway = {
    async discoverCandidates(_source, options) {
      const mediaType = options?.mediaType ?? "movie";
      const results =
        mediaType === "tv"
          ? TV_IDS.map((id) => summaryTv(id))
          : MOVIE_IDS.map((id) => summaryMovie(id));
      return { page: 1, results };
    },
    async fetchDetail(tmdbId, mediaType) {
      return mediaType === "tv" ? tvDetail(tmdbId) : movieDetail(tmdbId);
    },
  };

  return { ...tmdb, ...overrides };
}

type MockDb = MovieDbGateway & {
  /** Records keys as `mediaType:tmdb_id` — the same identity the real DB scopes on. */
  state: {
    keys(): string[];
    has(key: string): boolean;
  };
};

/**
 * Mock database gateway tracking rows by (media_type, tmdb_id) so it can
 * distinguish inserted vs updated and prove media-scoped uniqueness.
 */
function makeDb(
  existingKeys: string[] = [],
  overrides: Partial<MovieDbGateway> = {}
): MockDb {
  const existing = new Set(existingKeys);

  const db: MovieDbGateway = {
    async existingTmdbIds(ids, mediaType) {
      return new Set(
        ids.filter((id) => existing.has(`${mediaType}:${id}`))
      );
    },
    async upsertMovies(records) {
      let inserted = 0;
      let updated = 0;

      for (const record of records) {
        const key = `${record.media_type}:${record.tmdb_id}`;

        if (existing.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
          existing.add(key);
        }
      }

      return { inserted, updated, matched: records.length, error: null };
    },
  };

  return {
    ...db,
    ...overrides,
    state: {
      keys: () => Array.from(existing),
      has: (key) => existing.has(key),
    },
  };
}

// ---------------------------------------------------------------------------
// runIngestion
// ---------------------------------------------------------------------------

describe("runIngestion", () => {
  it("ingests a small controlled movie batch successfully", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const summary = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(summary.mediaType, "movie");
    assert.equal(summary.requested, 3);
    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 3);
    assert.equal(summary.updated, 0);
    assert.equal(summary.skippedInvalid, 0);
    assert.equal(summary.failedFetch, 0);
    assert.equal(summary.failedWrite, 0);
    assert.deepEqual(summary.errors, []);
    assert.ok(db.state.has("movie:1"));
    assert.ok(!db.state.has("tv:1"));
  });

  it("ingests a small controlled TV batch successfully", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const summary = await runIngestion({
      source: "trending",
      mediaType: "tv",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(summary.mediaType, "tv");
    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 3);
    assert.equal(summary.updated, 0);
    assert.equal(summary.skippedInvalid, 0);
    assert.equal(summary.failedWrite, 0);
    assert.ok(db.state.has("tv:101"));
    assert.ok(!db.state.has("movie:101"));
  });

  it("re-ingesting movies upserts instead of duplicating (idempotent)", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const first = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });
    const second = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(first.inserted, 3);
    assert.equal(first.updated, 0);
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 3);
    assert.equal(db.state.keys().length, 3, "database must never grow past unique rows");
  });

  it("re-ingesting TV upserts instead of duplicating (idempotent)", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const first = await runIngestion({
      source: "popular",
      mediaType: "tv",
      limit: 3,
      tmdb,
      db,
    });
    const second = await runIngestion({
      source: "popular",
      mediaType: "tv",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(first.inserted, 3);
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 3);
    assert.equal(db.state.keys().length, 3, "database must never grow past unique rows");
  });

  it("keeps movie and TV ids unique within their own media type", async () => {
    const tmdb = makeTmdb({
      // Force both media types to surface the SAME numeric ids.
      async discoverCandidates(_source, options) {
        const mediaType = options?.mediaType ?? "movie";
        const results =
          mediaType === "tv"
            ? MOVIE_IDS.map((id) => summaryTv(id))
            : MOVIE_IDS.map((id) => summaryMovie(id));
        return { page: 1, results };
      },
    });
    const db = makeDb();

    const movies = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });
    const shows = await runIngestion({
      source: "trending",
      mediaType: "tv",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(movies.inserted, 3);
    assert.equal(shows.inserted, 3, "tv ids must not collide with movie ids");
    assert.equal(db.state.keys().length, 6);
    assert.ok(db.state.has("movie:1"));
    assert.ok(db.state.has("tv:1"));
  });

  it("filters out movie candidates without a valid numeric id", async () => {
    const tmdb = makeTmdb({
      async discoverCandidates() {
        return {
          results: [
            summaryMovie(1),
            { id: "not-a-number" as unknown as number, title: "Bad id" },
            { title: "Missing id" } as TmdbMovieSummary,
          ],
        };
      },
    });
    const db = makeDb();

    const summary = await runIngestion({
      source: "discover",
      mediaType: "movie",
      limit: 10,
      tmdb,
      db,
    });

    assert.equal(summary.discovered, 1);
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
  });

  it("filters out TV candidates without a valid numeric id", async () => {
    const tmdb = makeTmdb({
      async discoverCandidates() {
        return {
          results: [
            summaryTv(101),
            { id: "not-a-number" as unknown as number, name: "Bad id" },
            { name: "Missing id" } as TmdbTvSummary,
          ],
        };
      },
    });
    const db = makeDb();

    const summary = await runIngestion({
      source: "discover",
      mediaType: "tv",
      limit: 10,
      tmdb,
      db,
    });

    assert.equal(summary.discovered, 1);
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
  });

  it("skips missing or invalid movie details without aborting the batch", async () => {
    const tmdb = makeTmdb({
      async fetchDetail(tmdbId, mediaType) {
        if (mediaType === "tv") return null;
        if (tmdbId === 1) return movieDetail(1);
        if (tmdbId === 2) return null; // TMDB has no record
        return { id: 3, title: "", adult: false, video: false }; // empty title -> invalid
      },
    });
    const db = makeDb();

    const summary = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 10,
      tmdb,
      db,
    });

    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.skippedInvalid, 2);
    assert.deepEqual(summary.errors, []);
  });

  it("skips missing or invalid TV details without aborting the batch", async () => {
    const tmdb = makeTmdb({
      async fetchDetail(tmdbId, mediaType) {
        if (mediaType === "movie") return null;
        if (tmdbId === 101) return tvDetail(101);
        if (tmdbId === 102) return null; // TMDB has no record
        return { id: 103, name: "   " }; // empty name -> invalid
      },
    });
    const db = makeDb();

    const summary = await runIngestion({
      source: "trending",
      mediaType: "tv",
      limit: 10,
      tmdb,
      db,
    });

    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.skippedInvalid, 2);
    assert.deepEqual(summary.errors, []);
  });

  it("reports a discovery failure as an aborted batch", async () => {
    const tmdb = makeTmdb({
      async discoverCandidates() {
        throw new Error("TMDB unreachable");
      },
    });
    const db = makeDb();

    const summary = await runIngestion({ source: "trending", limit: 3, tmdb, db });

    assert.equal(summary.discovered, 0);
    assert.equal(summary.fetched, 0);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0], /TMDB unreachable/);
  });

  it("continues the batch when an individual detail fetch fails", async () => {
    const tmdb = makeTmdb({
      async fetchDetail(tmdbId, mediaType) {
        if (mediaType === "tv") return tvDetail(tmdbId);
        if (tmdbId === 2) throw new Error("rate limited");
        return movieDetail(tmdbId);
      },
    });
    const db = makeDb();

    const summary = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 2);
    assert.equal(summary.failedFetch, 1);
    assert.equal(summary.inserted, 2);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0], /rate limited/);
  });

  it("records write failures without aborting the batch", async () => {
    const tmdb = makeTmdb();
    const db = makeDb([], {
      async upsertMovies(records) {
        return {
          inserted: 0,
          updated: 0,
          matched: records.length,
          error: "constraint violation",
        };
      },
    });

    const summary = await runIngestion({
      source: "trending",
      mediaType: "movie",
      limit: 3,
      tmdb,
      db,
    });

    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 0);
    assert.equal(summary.failedWrite, 3);
    assert.equal(summary.errors.length, 3);
    assert.match(summary.errors[0], /constraint violation/);
  });
});

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe("normalizeMovieDetail", () => {
  it("normalizes partial and malformed TMDB fields safely", () => {
    const result = normalizeMovieDetail({
      id: 42,
      title: "  Inception  ",
      overview: 123, // wrong type -> null
      release_date: "2010",
      vote_average: 99, // clamped to the 0-10 scale
      vote_count: "1500", // string number coerced
      genres: [{ id: 28, name: "Action" }],
      genre_ids: [28, 12],
      production_countries: [{ iso_3166_1: "US" }],
      runtime: 148.9,
      adult: true,
    } as unknown as TmdbMovieDetail);

    assert.equal(result.ok, true);
    assert.ok(result.value, "normalized record should exist");
    const record = result.value;

    assert.equal(record.media_type, "movie");
    assert.equal(record.tmdb_id, 42);
    assert.equal(record.title, "Inception");
    assert.equal(record.overview, null);
    assert.equal(record.release_date, "2010-01-01");
    assert.equal(record.vote_average, 10);
    assert.equal(record.vote_count, 1500);
    // genres objects take priority over genre_ids, so only the genre ids
    // present in the `genres` array survive.
    assert.deepEqual(record.genre_ids, [28]);
    assert.deepEqual(record.genres, ["Action"]);
    assert.deepEqual(record.origin_countries, ["US"]);
    assert.equal(record.runtime, 148);
    assert.equal(record.adult, true);
    // movie records leave TV-specific fields at their neutral defaults.
    assert.equal(record.number_of_episodes, null);
    assert.equal(record.number_of_seasons, null);
    assert.equal(record.last_air_date, null);
    assert.equal(record.in_production, false);
    assert.deepEqual(record.networks, []);
    assert.equal(validateMovieRecord(record).valid, true);
  });

  it("rejects non-object TMDB payloads", () => {
    assert.equal(normalizeMovieDetail(null).ok, false);
    assert.equal(normalizeMovieDetail(42).ok, false);
    assert.equal(normalizeMovieDetail("nope").ok, false);
    assert.equal(normalizeMovieDetail({ title: "no id" }).ok, false);
  });

  it("keeps full ISO dates and pads partial ones", () => {
    const dates = [
      { raw: "2020-05-14", expected: "2020-05-14" },
      { raw: "2020-05", expected: "2020-05-01" },
      { raw: "2020", expected: "2020-01-01" },
      { raw: "nonsense", expected: null },
    ];

    for (const { raw, expected } of dates) {
      const result = normalizeMovieDetail({ id: 1, title: "a", release_date: raw });
      assert.ok(result.ok);
      assert.equal(result.value?.release_date, expected);
    }
  });
});

describe("normalizeTvDetail", () => {
  it("maps TV fields into the shared record model safely", () => {
    const result = normalizeTvDetail({
      id: 99,
      name: "  Breaking Bad  ",
      original_name: "Breaking Bad",
      first_air_date: "2008",
      last_air_date: "2013-09-29",
      episode_run_time: [47, 58],
      number_of_episodes: 62,
      number_of_seasons: 5,
      in_production: false,
      networks: [{ id: 49, name: "AMC" }, { id: 0, name: "" }],
      genres: [{ id: 18, name: "Drama" }],
      origin_country: ["US"],
      adult: true, // ignored for tv
      video: true, // ignored for tv
      status: "Ended",
      vote_average: 9.5,
    } as unknown as TmdbTvDetail);

    assert.equal(result.ok, true);
    assert.ok(result.value, "normalized record should exist");
    const record = result.value;

    assert.equal(record.media_type, "tv");
    assert.equal(record.tmdb_id, 99);
    assert.equal(record.title, "Breaking Bad");
    assert.equal(record.original_title, "Breaking Bad");
    assert.equal(record.release_date, "2008-01-01");
    assert.equal(record.last_air_date, "2013-09-29");
    assert.equal(record.runtime, 47);
    assert.equal(record.number_of_episodes, 62);
    assert.equal(record.number_of_seasons, 5);
    assert.equal(record.in_production, false);
    assert.deepEqual(record.networks, ["AMC"]);
    assert.deepEqual(record.genre_ids, [18]);
    assert.deepEqual(record.genres, ["Drama"]);
    assert.deepEqual(record.origin_countries, ["US"]);
    assert.equal(record.adult, false);
    assert.equal(record.video, false);
    assert.equal(record.status, "Ended");
    assert.equal(validateMovieRecord(record).valid, true);
  });

  it("handles malformed TV-specific fields without throwing", () => {
    const result = normalizeTvDetail({
      id: 7,
      name: "ok",
      episode_run_time: ["60", "not-a-number"], // string coerced
      number_of_episodes: "13", // string number coerced
      number_of_seasons: null,
      networks: [{ name: "HBO" }, "junk"],
    } as unknown as TmdbTvDetail);

    assert.equal(result.ok, true);
    const record = result.value as OrielMediaRecord;
    assert.equal(record.runtime, 60);
    assert.equal(record.number_of_episodes, 13);
    assert.equal(record.number_of_seasons, null);
    assert.deepEqual(record.networks, ["HBO"]);
  });

  it("rejects non-object TMDB payloads", () => {
    assert.equal(normalizeTvDetail(null).ok, false);
    assert.equal(normalizeTvDetail({ name: "no id" }).ok, false);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe("validateMovieRecord", () => {
  it("rejects records with no usable title", () => {
    const result = normalizeMovieDetail({ id: 7, title: "   " });
    assert.ok(result.ok);
    assert.equal(validateMovieRecord(result.value as OrielMediaRecord).valid, false);
  });

  it("rejects out-of-range vote averages", () => {
    // normalizeMovieDetail clamps to the 0-10 scale, so build the record
    // directly to exercise the validator's safety net.
    const result = normalizeMovieDetail({ id: 7, title: "ok" });
    assert.ok(result.ok);
    const record = result.value as OrielMediaRecord;
    record.vote_average = 11;
    assert.equal(validateMovieRecord(record).valid, false);
  });

  it("accepts records missing optional fields", () => {
    const result = normalizeTvDetail({ id: 7, name: "ok" });
    assert.ok(result.ok);
    assert.equal(validateMovieRecord(result.value as OrielMediaRecord).valid, true);
  });
});
