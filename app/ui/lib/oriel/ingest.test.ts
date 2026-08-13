// Ingestion engine tests (node:test, run with tsx loader).
//
// The engine is dependency-injected, so these tests exercise the full
// discovery -> detail -> normalize -> validate -> upsert pipeline against
// mock TMDB and database gateways. No network or database calls are made.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runIngestion } from "./ingest";
import { normalizeMovieDetail } from "./normalize";
import { validateMovieRecord } from "./validate";
import type {
  MovieDbGateway,
  OrielMovieRecord,
  TmdbGateway,
  TmdbMovieDetail,
  TmdbMovieSummary,
} from "./types";

function summaryMovie(id: number, title = `Movie ${id}`): TmdbMovieSummary {
  return { id, title, original_language: "en" };
}

function detail(
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

function makeTmdb(overrides: Partial<TmdbGateway> = {}): TmdbGateway {
  const tmdb: TmdbGateway = {
    async discoverCandidates() {
      return { page: 1, results: [summaryMovie(1), summaryMovie(2), summaryMovie(3)] };
    },
    async fetchMovieDetail(tmdbId) {
      return detail(tmdbId);
    },
  };

  return { ...tmdb, ...overrides };
}

/**
 * Mock database gateway. `existingIds` simulates rows already in the table so
 * the upsert accounting can distinguish inserted vs updated.
 */
function makeDb(
  existingIds: number[] = [],
  overrides: Partial<MovieDbGateway> = {}
): MovieDbGateway {
  const existing = new Set(existingIds);

  const db: MovieDbGateway = {
    async existingTmdbIds() {
      return existing;
    },
    async upsertMovies(records) {
      let inserted = 0;
      let updated = 0;

      for (const record of records) {
        if (existing.has(record.tmdb_id)) {
          updated += 1;
        } else {
          inserted += 1;
        }
      }

      return { inserted, updated, matched: records.length, error: null };
    },
  };

  return { ...db, ...overrides };
}

describe("runIngestion", () => {
  it("ingests a small controlled batch successfully", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const summary = await runIngestion({ source: "trending", limit: 3, tmdb, db });

    assert.equal(summary.source, "trending");
    assert.equal(summary.requested, 3);
    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 3);
    assert.equal(summary.updated, 0);
    assert.equal(summary.skippedInvalid, 0);
    assert.equal(summary.failedFetch, 0);
    assert.equal(summary.failedWrite, 0);
    assert.deepEqual(summary.errors, []);
  });

  it("caps the batch at the requested limit", async () => {
    const tmdb = makeTmdb();
    const db = makeDb();

    const summary = await runIngestion({ source: "popular", limit: 2, tmdb, db });

    assert.equal(summary.requested, 2);
    assert.equal(summary.discovered, 2);
    assert.equal(summary.fetched, 2);
    assert.equal(summary.inserted, 2);
  });

  it("upserts rows that already exist by tmdb_id instead of duplicating", async () => {
    const tmdb = makeTmdb();
    const db = makeDb([1, 2]);

    const summary = await runIngestion({ source: "top_rated", limit: 3, tmdb, db });

    assert.equal(summary.discovered, 3);
    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.updated, 2);
  });

  it("never creates duplicates across repeated runs (idempotent)", async () => {
    const tmdb = makeTmdb();
    const known = new Set<number>();

    const db = makeDb([], {
      async upsertMovies(records) {
        let inserted = 0;
        let updated = 0;

        for (const record of records) {
          if (known.has(record.tmdb_id)) {
            updated += 1;
          } else {
            inserted += 1;
            known.add(record.tmdb_id);
          }
        }

        return { inserted, updated, matched: records.length, error: null };
      },
    });

    const first = await runIngestion({ source: "trending", limit: 3, tmdb, db });
    const second = await runIngestion({ source: "trending", limit: 3, tmdb, db });

    assert.equal(first.inserted, 3);
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 3);
    assert.equal(known.size, 3, "database must never grow past unique rows");
  });

  it("filters out candidates without a valid numeric id", async () => {
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

    const summary = await runIngestion({ source: "discover", limit: 10, tmdb, db });

    assert.equal(summary.discovered, 1);
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
  });

  it("skips missing or invalid detail records without aborting the batch", async () => {
    const tmdb = makeTmdb({
      async fetchMovieDetail(tmdbId) {
        if (tmdbId === 1) return detail(1);
        if (tmdbId === 2) return null; // TMDB has no record
        return { id: 3, title: "", adult: false, video: false }; // empty title -> invalid
      },
    });
    const db = makeDb();

    const summary = await runIngestion({ source: "trending", limit: 10, tmdb, db });

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
      async fetchMovieDetail(tmdbId) {
        if (tmdbId === 2) throw new Error("rate limited");
        return detail(tmdbId);
      },
    });
    const db = makeDb();

    const summary = await runIngestion({ source: "trending", limit: 3, tmdb, db });

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

    const summary = await runIngestion({ source: "trending", limit: 3, tmdb, db });

    assert.equal(summary.fetched, 3);
    assert.equal(summary.inserted, 0);
    assert.equal(summary.failedWrite, 3);
    assert.equal(summary.errors.length, 3);
    assert.match(summary.errors[0], /constraint violation/);
  });
});

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

describe("validateMovieRecord", () => {
  it("rejects records with no usable title", () => {
    const result = normalizeMovieDetail({ id: 7, title: "   " });
    assert.ok(result.ok);
    assert.equal(validateMovieRecord(result.value as OrielMovieRecord).valid, false);
  });

  it("rejects out-of-range vote averages", () => {
    // normalizeMovieDetail clamps to the 0-10 scale, so build the record
    // directly to exercise the validator's safety net.
    const result = normalizeMovieDetail({ id: 7, title: "ok" });
    assert.ok(result.ok);
    const record = result.value as OrielMovieRecord;
    record.vote_average = 11;
    assert.equal(validateMovieRecord(record).valid, false);
  });

  it("accepts records missing optional fields", () => {
    const result = normalizeMovieDetail({ id: 7, title: "ok" });
    assert.ok(result.ok);
    assert.equal(validateMovieRecord(result.value as OrielMovieRecord).valid, true);
  });
});
