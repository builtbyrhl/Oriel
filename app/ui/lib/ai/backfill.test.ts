// Backfill engine tests (node:test, run with tsx loader).
//
// `backfillEnrichment` drains the enrichment queue across many batches, and
// `getEnrichmentCoverage` reports how much of a catalog is left. The engine
// is dependency-injected with a mocked AI provider and enrichment DB gateway
// (same harness shape as enrich.test.ts); no live AI or network calls.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { backfillEnrichment, getEnrichmentCoverage } from "./enrich";
import type {
  AiProvider,
  AiStructuredRequest,
  EnrichmentDbGateway,
  EnrichmentJobRow,
  SemanticEnrichmentRecord,
  SemanticFields,
} from "./types";
import type { MediaType, OrielMediaRecord } from "../oriel/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validFields: SemanticFields = {
  moods: ["tense", "melancholic"],
  tone: "dark and suspenseful",
  pacing: "fast",
  themes: ["justice", "identity"],
  semantic_genres: ["neo-noir", "slow-burn thriller"],
  intensity: 7,
  audience_descriptors: ["mature audiences", "fans of psychological drama"],
};

function movieRecord(tmdbId: number, title = `Movie ${tmdbId}`): OrielMediaRecord {
  return {
    media_type: "movie",
    tmdb_id: tmdbId,
    title,
    original_title: null,
    overview: "A test synopsis.",
    poster_path: null,
    backdrop_path: null,
    release_date: "2020-05-14",
    vote_average: 7.5,
    vote_count: 100,
    popularity: 10,
    genre_ids: [28],
    genres: ["Action"],
    original_language: "en",
    adult: false,
    video: false,
    runtime: 120,
    origin_countries: ["US"],
    status: "Released",
    number_of_episodes: null,
    number_of_seasons: null,
    last_air_date: null,
    in_production: false,
    networks: [],
  };
}

function makeProvider(
  impl: (request: AiStructuredRequest) => Promise<unknown>
): AiProvider & { calls: AiStructuredRequest[] } {
  const calls: AiStructuredRequest[] = [];

  return {
    name: "mock",
    model: "mock-model",
    async generateStructured(request) {
      calls.push(request);
      return impl(request);
    },
    calls,
  };
}

type MockEnrichmentDb = {
  db: EnrichmentDbGateway;
  state: {
    jobs: Map<string, EnrichmentJobRow>;
    semantics: Map<string, SemanticEnrichmentRecord>;
    addMedia(record: OrielMediaRecord): void;
    getJob(key: string): EnrichmentJobRow | undefined;
    hasSemantics(key: string): boolean;
  };
};

function makeEnrichmentDb(
  overrides: Partial<EnrichmentDbGateway> = {}
): MockEnrichmentDb {
  const jobs = new Map<string, EnrichmentJobRow>();
  const semantics = new Map<string, SemanticEnrichmentRecord>();
  const mediaPool = new Map<string, OrielMediaRecord>();
  const now = () => new Date().toISOString();

  const db: EnrichmentDbGateway = {
    async getMedia(mediaType, tmdbId) {
      return mediaPool.get(`${mediaType}:${tmdbId}`) ?? null;
    },

    async claimEnrichment(mediaType, tmdbId, maxAttempts) {
      const key = `${mediaType}:${tmdbId}`;
      const job = jobs.get(key);

      if (job?.status === "succeeded") {
        return { proceed: false, reason: "already_succeeded", attempt: job.attempt_count };
      }

      if (job && job.attempt_count >= job.max_attempts) {
        return { proceed: false, reason: "attempts_exhausted", attempt: job.attempt_count };
      }

      const attempt = (job?.attempt_count ?? 0) + 1;

      jobs.set(key, {
        media_type: mediaType,
        tmdb_id: tmdbId,
        status: "processing",
        attempt_count: attempt,
        max_attempts: job?.max_attempts ?? maxAttempts,
        last_error: null,
        last_run_at: now(),
        next_run_at: null,
        created_at: job?.created_at ?? now(),
        updated_at: now(),
      });

      return { proceed: true, reason: "ok", attempt };
    },

    async saveSemantics(record) {
      semantics.set(`${record.media_type}:${record.tmdb_id}`, record);
    },

    async finishEnrichment(mediaType, tmdbId, status, error) {
      const key = `${mediaType}:${tmdbId}`;
      const job = jobs.get(key);

      if (!job) throw new Error("finishEnrichment called without a claim");

      const nextRun =
        status === "failed" ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;

      jobs.set(key, {
        ...job,
        status,
        last_error: error ?? null,
        next_run_at: nextRun,
        updated_at: now(),
      });
    },

    async getEnrichmentQueue(mediaType, limit) {
      const items: Array<{ media_type: MediaType; tmdb_id: number }> = [];
      const cutoff = now();

      for (const media of mediaPool.values()) {
        if (media.media_type !== mediaType) continue;

        const job = jobs.get(`${media.media_type}:${media.tmdb_id}`);

        if (!job) {
          items.push({ media_type: media.media_type, tmdb_id: media.tmdb_id });
          continue;
        }

        if (
          job.status !== "succeeded" &&
          job.attempt_count < job.max_attempts &&
          (job.next_run_at === null || job.next_run_at <= cutoff)
        ) {
          items.push({ media_type: media.media_type, tmdb_id: media.tmdb_id });
        }
      }

      return items.slice(0, limit);
    },

    async getEnrichmentCoverage(mediaType) {
      let total = 0;
      let enriched = 0;

      for (const media of mediaPool.values()) {
        if (media.media_type !== mediaType) continue;

        total += 1;

        if (jobs.get(`${media.media_type}:${media.tmdb_id}`)?.status === "succeeded") {
          enriched += 1;
        }
      }

      return { mediaType, total, enriched, remaining: total - enriched };
    },
  };

  return {
    db: { ...db, ...overrides },
    state: {
      jobs,
      semantics,
      addMedia(record) {
        mediaPool.set(`${record.media_type}:${record.tmdb_id}`, record);
      },
      getJob(key) {
        return jobs.get(key);
      },
      hasSemantics(key) {
        return semantics.has(key);
      },
    },
  };
}

function seedMovies(env: MockEnrichmentDb, count: number): void {
  for (let i = 1; i <= count; i++) env.state.addMedia(movieRecord(i));
}

// ---------------------------------------------------------------------------
// getEnrichmentCoverage
// ---------------------------------------------------------------------------

describe("getEnrichmentCoverage", () => {
  it("reports total / enriched / remaining for a media type", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 5);

    assert.deepEqual(await getEnrichmentCoverage("movie", env.db), {
      mediaType: "movie",
      total: 5,
      enriched: 0,
      remaining: 5,
    });

    const provider = makeProvider(async () => validFields);
    await backfillEnrichment({ mediaType: "movie", provider, db: env.db, maxItems: 2 });

    assert.deepEqual(await getEnrichmentCoverage("movie", env.db), {
      mediaType: "movie",
      total: 5,
      enriched: 2,
      remaining: 3,
    });
  });

  it("is scoped to a single media type", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 3);
    env.state.addMedia({ ...movieRecord(1), media_type: "tv", tmdb_id: 99, title: "Series 99" });

    const coverage = await getEnrichmentCoverage("tv", env.db);
    assert.equal(coverage?.total, 1);
    assert.equal(coverage?.remaining, 1);
  });
});

// ---------------------------------------------------------------------------
// backfillEnrichment
// ---------------------------------------------------------------------------

describe("backfillEnrichment", () => {
  it("drains a catalog larger than one batch across multiple batches", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 25);
    const provider = makeProvider(async () => validFields);

    const summary = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 10,
      maxItems: 100,
      provider,
      db: env.db,
    });

    assert.equal(summary.batches, 3, "25 items in 10-item batches = 3 batches");
    assert.equal(summary.requested, 25);
    assert.equal(summary.attempted, 25);
    assert.equal(summary.succeeded, 25);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
    assert.deepEqual(summary.errors, []);
    assert.equal(summary.stopped, "exhausted");
    assert.equal(provider.calls.length, 25);
    assert.equal(env.state.semantics.size, 25);
  });

  it("stops at maxItems with stopped=cap_reached", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 50);
    const provider = makeProvider(async () => validFields);

    const summary = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 10,
      maxItems: 15,
      provider,
      db: env.db,
    });

    assert.equal(summary.batches, 2);
    assert.equal(summary.attempted, 15);
    assert.equal(summary.succeeded, 15);
    assert.equal(summary.stopped, "cap_reached");
    assert.equal(env.state.semantics.size, 15, "rest of the catalog stays untouched");

    const coverage = await getEnrichmentCoverage("movie", env.db);
    assert.equal(coverage?.remaining, 35);
  });

  it("reports exhausted when the queue empties mid-cap", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 5);
    const provider = makeProvider(async () => validFields);

    const summary = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 10,
      maxItems: 50,
      provider,
      db: env.db,
    });

    assert.equal(summary.batches, 1);
    assert.equal(summary.attempted, 5);
    assert.equal(summary.stopped, "exhausted");
  });

  it("keeps draining after a failed batch and aggregates failures", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 8);
    const provider = makeProvider(async (request) => {
      if (request.userPrompt.includes("Movie 2")) throw new Error("ai outage");
      return validFields;
    });

    const summary = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 4,
      maxItems: 100,
      provider,
      db: env.db,
    });

    assert.equal(summary.batches, 2);
    assert.equal(summary.attempted, 8);
    assert.equal(summary.succeeded, 7);
    assert.equal(summary.failed, 1);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0], /ai outage/);
    assert.equal(summary.stopped, "exhausted");
    assert.equal(env.state.semantics.size, 7);
    assert.equal(env.state.getJob("movie:2")?.status, "failed");
  });

  it("fires the progress callback once per batch with cumulative totals", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 25);
    const provider = makeProvider(async () => validFields);
    const batches: Array<{ processed: number; succeeded: number; failed: number; batches: number }> = [];

    await backfillEnrichment({
      mediaType: "movie",
      batchSize: 10,
      maxItems: 100,
      provider,
      db: env.db,
      onBatch: (_batch, progress) => batches.push({ ...progress }),
    });

    assert.equal(batches.length, 3);
    assert.deepEqual(
      batches.map((b) => b.processed),
      [10, 20, 25]
    );
    assert.deepEqual(
      batches.map((b) => b.succeeded),
      [10, 20, 25]
    );
    assert.deepEqual(
      batches.map((b) => b.batches),
      [1, 2, 3]
    );
  });

  it("is idempotent: re-running a drained catalog does no work", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 6);
    const provider = makeProvider(async () => validFields);

    const first = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 4,
      maxItems: 100,
      provider,
      db: env.db,
    });
    assert.equal(first.stopped, "exhausted");
    assert.equal(first.succeeded, 6);

    const spy = makeProvider(async () => {
      throw new Error("provider must not be called again");
    });

    const second = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 4,
      maxItems: 100,
      provider: spy,
      db: env.db,
    });

    assert.equal(second.batches, 0, "an already-drained run does no batches of work");
    assert.equal(second.attempted, 0);
    assert.equal(second.stopped, "exhausted");
    assert.equal(spy.calls.length, 0);
  });

  it("clamps batchSize into [1, 100] and defaults maxItems", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 3);

    const summary = await backfillEnrichment({
      mediaType: "movie",
      batchSize: 0,
      maxItems: 1,
      provider: makeProvider(async () => validFields),
      db: env.db,
    });

    assert.equal(summary.attempted, 1, "batchSize 0 clamps to 1, maxItems 1 caps the run");
    assert.equal(summary.stopped, "cap_reached");
  });

  it("passes schemaVersion through to the persisted records", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 2);

    await backfillEnrichment({
      mediaType: "movie",
      maxItems: 5,
      schemaVersion: 2,
      provider: makeProvider(async () => validFields),
      db: env.db,
    });

    const record = env.state.semantics.get("movie:1");
    assert.equal(record?.version, 2);
  });

  it("only processes the requested media type", async () => {
    const env = makeEnrichmentDb();
    seedMovies(env, 3);
    env.state.addMedia({ ...movieRecord(1), media_type: "tv", tmdb_id: 99, title: "Series 99" });

    const summary = await backfillEnrichment({
      mediaType: "movie",
      maxItems: 100,
      provider: makeProvider(async () => validFields),
      db: env.db,
    });

    assert.equal(summary.attempted, 3);
    assert.ok(!env.state.hasSemantics("tv:99"), "tv media is left untouched");
  });
});
