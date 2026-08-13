// Catalogue expansion engine tests (node:test, run with tsx loader).
//
// These exercise plan building and the expansion runner against mock TMDB and
// database gateways — no network or database calls.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PAGE_DEPTH,
  MOVIE_GENRE_IDS,
  TV_GENRE_IDS,
  buildExpansionPlan,
  runExpansion,
} from "./expansion";
import type {
  MediaType,
  MovieDbGateway,
  TmdbGateway,
  TmdbListResult,
  TmdbMovieDetail,
  TmdbMovieSummary,
  TmdbTvDetail,
  TmdbTvSummary,
  UpsertOutcome,
} from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function summaryMovie(id: number, title = `Movie ${id}`): TmdbMovieSummary {
  return { id, title, original_language: "en" };
}

function summaryTv(id: number, name = `Show ${id}`): TmdbTvSummary {
  return { id, name, original_language: "en" };
}

function movieDetail(id: number): TmdbMovieDetail {
  return {
    id,
    title: `Movie ${id}`,
    original_language: "en",
    adult: false,
    video: false,
  };
}

function tvDetail(id: number): TmdbTvDetail {
  return { id, name: `Show ${id}`, original_language: "en" };
}

/** TMDB gateway that yields a rotating slice of ids per call. */
function makeTmdb(
  idsByCall: number[][],
  mediaType: MediaType = "movie"
): TmdbGateway & { fetchCount: number } {
  let call = 0;
  let fetchCount = 0;

  return {
    get fetchCount() {
      return fetchCount;
    },
    async discoverCandidates(): Promise<TmdbListResult> {
      const ids = idsByCall[call % idsByCall.length] ?? [];
      call += 1;
      return {
        page: call,
        results: ids.map((id) =>
          mediaType === "tv" ? summaryTv(id) : summaryMovie(id)
        ),
      };
    },
    async fetchDetail(tmdbId: number, type: MediaType) {
      fetchCount += 1;
      return type === "tv" ? tvDetail(tmdbId) : movieDetail(tmdbId);
    },
  };
}

function makeDb(existingKeys: string[] = []): MovieDbGateway & {
  keys: () => string[];
} {
  const existing = new Set(existingKeys);

  return {
    keys: () => Array.from(existing),
    async existingTmdbIds(ids, mediaType) {
      return new Set(ids.filter((id) => existing.has(`${mediaType}:${id}`)));
    },
    async upsertMovies(records): Promise<UpsertOutcome> {
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
}

// ---------------------------------------------------------------------------
// buildExpansionPlan
// ---------------------------------------------------------------------------

describe("buildExpansionPlan", () => {
  it("orders tiers trending -> top_rated -> popular -> per-genre", () => {
    const plan = buildExpansionPlan({ mediaType: "movie" });

    assert.equal(plan[0].source, "trending");
    assert.equal(plan[1].source, "top_rated");
    assert.equal(plan[2].source, "discover");
    assert.equal(plan[2].genreId, undefined);

    const firstGenre = plan.find((step) => step.genreId !== undefined);
    assert.ok(firstGenre);
    assert.equal(firstGenre.genreId, MOVIE_GENRE_IDS[0]);
    assert.equal(firstGenre.page, 1);

    const expected =
      1 + 1 + DEFAULT_PAGE_DEPTH.popular + MOVIE_GENRE_IDS.length * DEFAULT_PAGE_DEPTH.genre;
    assert.equal(plan.length, expected);
  });

  it("uses the TV genre set for series", () => {
    const plan = buildExpansionPlan({ mediaType: "tv" });
    const genreSteps = plan.filter((step) => step.genreId !== undefined);

    const genreIds = Array.from(new Set(genreSteps.map((step) => step.genreId)));
    assert.deepEqual(genreIds, TV_GENRE_IDS);
  });

  it("honors pageDepth and genreIds overrides", () => {
    const plan = buildExpansionPlan({
      mediaType: "movie",
      pageDepth: { trending: 2, topRated: 0, popular: 2, genre: 1 },
      genreIds: [28, 12],
    });

    assert.equal(plan.length, 2 + 0 + 2 + 2 * 1);

    const genreSteps = plan.filter((step) => step.genreId !== undefined);
    assert.deepEqual(Array.from(new Set(genreSteps.map((s) => s.genreId))), [28, 12]);
    assert.equal(genreSteps.filter((s) => s.genreId === 28).length, 1);
    assert.equal(plan[0].source, "trending");
    assert.equal(plan[0].page, 1);
    assert.equal(plan[1].source, "trending");
    assert.equal(plan[1].page, 2);
  });
});

// ---------------------------------------------------------------------------
// runExpansion
// ---------------------------------------------------------------------------

describe("runExpansion", () => {
  it("runs steps until the target of new inserts is reached", async () => {
    const tmdb = makeTmdb([[1, 2], [3, 4], [5, 6]]);
    const db = makeDb();

    const summary = await runExpansion({
      mediaType: "movie",
      target: 3,
      pageDepth: { trending: 1, topRated: 0, popular: 2, genre: 0 },
      tmdb,
      db,
    });

    assert.equal(summary.reached, true);
    assert.equal(summary.steps.length, 2, "stops after the step that crosses target");
    assert.equal(summary.totals.inserted, 4);
    assert.equal(summary.totals.skippedExisting, 0);
    assert.equal(db.keys().length, 4);
  });

  it("stops when the plan is exhausted without reaching the target", async () => {
    const tmdb = makeTmdb([[1, 2], [3, 4]]);
    const db = makeDb();

    const summary = await runExpansion({
      mediaType: "movie",
      target: 10,
      pageDepth: { trending: 1, topRated: 0, popular: 1, genre: 0 },
      tmdb,
      db,
    });

    assert.equal(summary.reached, false);
    assert.equal(summary.steps.length, 2);
    assert.equal(summary.totals.inserted, 4);
  });

  it("never fetches the same title twice within a run across overlapping steps", async () => {
    // Every step surfaces the SAME two titles (popular + genre overlap).
    const tmdb = makeTmdb([[1, 2]]);
    const db = makeDb();

    const summary = await runExpansion({
      mediaType: "movie",
      target: 100,
      pageDepth: { trending: 1, topRated: 0, popular: 3, genre: 2 },
      genreIds: { movie: [28], tv: [] },
      tmdb,
      db,
    });

    assert.equal(summary.steps.length, 6);
    assert.equal(tmdb.fetchCount, 2, "only the two unique titles are fetched once");
    assert.equal(summary.totals.inserted, 2);
    assert.ok(summary.totals.skippedExisting >= 2, "later steps skip the already-seen titles");
  });

  it("skips already-ingested titles from earlier runs", async () => {
    const tmdb = makeTmdb([[1, 2]]);
    const db = makeDb(["movie:1", "movie:2"]);

    const summary = await runExpansion({
      mediaType: "movie",
      target: 100,
      pageDepth: { trending: 1, topRated: 0, popular: 1, genre: 0 },
      tmdb,
      db,
    });

    assert.equal(summary.reached, false);
    assert.equal(summary.totals.inserted, 0);
    assert.equal(summary.totals.skippedExisting, 4);
    assert.equal(tmdb.fetchCount, 0, "existing titles are never detail-fetched");
  });

  it("ingests across both media types when no single mediaType is given", async () => {
    const tmdb = makeTmdb([[1, 2], [101, 102]], "movie") as TmdbGateway &
      { fetchCount: number };
    const db = makeDb();

    const summary = await runExpansion({
      target: 100,
      mediaTypes: ["movie", "tv"],
      pageDepth: { trending: 1, topRated: 0, popular: 1, genre: 0 },
      tmdb,
      db,
    });

    assert.ok(summary.mediaTypes.includes("movie"));
    assert.ok(summary.mediaTypes.includes("tv"));
    assert.ok(db.keys().some((key) => key.startsWith("movie:")));
    assert.ok(db.keys().some((key) => key.startsWith("tv:")));
  });
});
