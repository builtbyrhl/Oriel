// Enrichment engine tests (node:test, run with tsx loader).
//
// The engine is dependency-injected: a mocked AI provider and a mocked
// enrichment DB gateway drive the full claim → prompt → validate → persist
// pipeline. No live AI or network calls are made.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { enrichBatch, enrichMedia } from "./enrich";
import { buildEnrichmentRequest } from "./prompt";
import { parseSemanticFields, SEMANTIC_FIELDS_JSON_SCHEMA } from "./schema";
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
    seedJob(job: EnrichmentJobRow): void;
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

      jobs.set(key, { ...job, status, last_error: error ?? null, updated_at: now() });
    },

    async getEnrichmentQueue(mediaType, limit) {
      const items: Array<{ media_type: MediaType; tmdb_id: number }> = [];

      for (const media of mediaPool.values()) {
        if (media.media_type !== mediaType) continue;

        const job = jobs.get(`${media.media_type}:${media.tmdb_id}`);

        if (!job) {
          items.push({ media_type: media.media_type, tmdb_id: media.tmdb_id });
          continue;
        }

        if (job.status !== "succeeded" && job.attempt_count < job.max_attempts) {
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
      seedJob(job) {
        jobs.set(`${job.media_type}:${job.tmdb_id}`, job);
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

// ---------------------------------------------------------------------------
// enrichMedia
// ---------------------------------------------------------------------------

describe("enrichMedia", () => {
  it("enriches a media item and persists validated semantics", async () => {
    const env = makeEnrichmentDb();
    env.state.addMedia(movieRecord(1));
    const provider = makeProvider(async () => validFields);

    const result = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider,
      db: env.db,
    });

    assert.equal(result.status, "succeeded");
    assert.equal(provider.calls.length, 1);

    const record = env.state.semantics.get("movie:1");
    assert.ok(record, "semantics must be persisted");
    assert.equal(record?.provider, "mock");
    assert.equal(record?.model, "mock-model");
    assert.equal(record?.version, 1);
    assert.deepEqual(record?.fields, validFields);
    assert.equal(env.state.getJob("movie:1")?.status, "succeeded");
  });

  it("skips already-enriched media without calling the provider (idempotent)", async () => {
    const env = makeEnrichmentDb();
    env.state.addMedia(movieRecord(1));
    const firstProvider = makeProvider(async () => validFields);

    const first = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider: firstProvider,
      db: env.db,
    });
    assert.equal(first.status, "succeeded");

    const spy = makeProvider(async () => {
      throw new Error("provider must not be called again");
    });
    const second = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider: spy,
      db: env.db,
    });

    assert.equal(second.status, "skipped");
    assert.equal(second.reason, "already_succeeded");
    assert.equal(spy.calls.length, 0);
  });

  it("retries after a provider failure and succeeds on a later attempt", async () => {
    const env = makeEnrichmentDb();
    env.state.addMedia(movieRecord(1));

    let calls = 0;
    const provider = makeProvider(async () => {
      calls += 1;
      if (calls === 1) throw new Error("provider down");
      return validFields;
    });

    const first = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider,
      db: env.db,
    });

    assert.equal(first.status, "failed");
    assert.match(first.error, /provider down/);
    assert.equal(env.state.getJob("movie:1")?.status, "failed");
    assert.equal(env.state.getJob("movie:1")?.attempt_count, 1);
    assert.ok(!env.state.hasSemantics("movie:1"));

    const second = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider,
      db: env.db,
    });

    assert.equal(second.status, "succeeded");
    assert.equal(env.state.getJob("movie:1")?.attempt_count, 2);
    assert.ok(env.state.hasSemantics("movie:1"));
  });

  it("gives up (skips) when a failed job has exhausted its attempts", async () => {
    const env = makeEnrichmentDb();
    env.state.addMedia(movieRecord(1));
    env.state.seedJob({
      media_type: "movie",
      tmdb_id: 1,
      status: "failed",
      attempt_count: 3,
      max_attempts: 3,
      last_error: "permanent failure",
      last_run_at: new Date().toISOString(),
      next_run_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const provider = makeProvider(async () => validFields);
    const result = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider,
      db: env.db,
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "attempts_exhausted");
    assert.equal(provider.calls.length, 0);
  });

  it("rejects invalid structured output and keeps the movie usable", async () => {
    const env = makeEnrichmentDb();
    env.state.addMedia(movieRecord(1));

    const provider = makeProvider(async () => ({
      moods: [],
      tone: "x",
      pacing: "fast",
      themes: ["a"],
      semantic_genres: ["b"],
      intensity: 7,
      audience_descriptors: ["c"],
    }));

    const result = await enrichMedia({
      mediaType: "movie",
      tmdbId: 1,
      provider,
      db: env.db,
    });

    assert.equal(result.status, "failed");
    assert.match(result.error, /Invalid structured output/);
    assert.ok(!env.state.hasSemantics("movie:1"), "invalid output must not persist");
    assert.equal(env.state.getJob("movie:1")?.status, "failed");

    const media = await env.db.getMedia("movie", 1);
    assert.ok(media, "movie must remain readable after an AI failure");
  });

  it("fails cleanly when the media item does not exist", async () => {
    const env = makeEnrichmentDb();
    const provider = makeProvider(async () => validFields);

    const result = await enrichMedia({
      mediaType: "movie",
      tmdbId: 999,
      provider,
      db: env.db,
    });

    assert.equal(result.status, "failed");
    assert.match(result.error, /not found/);
    assert.equal(provider.calls.length, 0);
    assert.equal(env.state.getJob("movie:999")?.status, "failed");
  });
});

// ---------------------------------------------------------------------------
// enrichBatch
// ---------------------------------------------------------------------------

describe("enrichBatch", () => {
  it("processes a small controlled batch and aggregates the summary", async () => {
    const env = makeEnrichmentDb();

    for (let i = 1; i <= 5; i++) env.state.addMedia(movieRecord(i));

    const provider = makeProvider(async () => validFields);

    const summary = await enrichBatch({
      mediaType: "movie",
      limit: 3,
      provider,
      db: env.db,
    });

    assert.equal(summary.mediaType, "movie");
    assert.equal(summary.requested, 3);
    assert.equal(summary.attempted, 3);
    assert.equal(summary.succeeded, 3);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
    assert.deepEqual(summary.errors, []);
    assert.equal(provider.calls.length, 3);
  });

  it("skips items that are already enriched and counts failures", async () => {
    const env = makeEnrichmentDb();

    for (let i = 1; i <= 4; i++) env.state.addMedia(movieRecord(i));

    // Enrich item 1 first so the batch skips it.
    const firstProvider = makeProvider(async () => validFields);
    await enrichMedia({ mediaType: "movie", tmdbId: 1, provider: firstProvider, db: env.db });

    const provider = makeProvider(async (request) => {
      if (request.userPrompt.includes("Movie 2")) throw new Error("ai outage");
      return validFields;
    });

    const summary = await enrichBatch({
      mediaType: "movie",
      limit: 4,
      provider,
      db: env.db,
    });

    assert.equal(summary.requested, 4);
    assert.equal(summary.attempted, 3, "already-enriched item is excluded from the queue");
    assert.equal(summary.skipped, 0);
    assert.equal(summary.succeeded, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.errors.length, 1);
    assert.match(summary.errors[0], /ai outage/);
  });
});

// ---------------------------------------------------------------------------
// buildEnrichmentRequest
// ---------------------------------------------------------------------------

describe("buildEnrichmentRequest", () => {
  it("includes media metadata and forbids rating/recommending", () => {
    const request = buildEnrichmentRequest(movieRecord(1, "Inception"));

    assert.match(request.userPrompt, /Inception/);
    assert.match(request.userPrompt, /2020/);
    assert.match(request.userPrompt, /semantic_genres/);
    assert.match(request.systemPrompt, /do not rate/);
    assert.deepEqual(request.jsonSchema, SEMANTIC_FIELDS_JSON_SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// parseSemanticFields (strict structured output)
// ---------------------------------------------------------------------------

describe("parseSemanticFields", () => {
  it("accepts a well-formed envelope", () => {
    const result = parseSemanticFields(validFields);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.fields, validFields);
  });

  it("trims and de-duplicates list values", () => {
    const result = parseSemanticFields({
      ...validFields,
      moods: [" tense ", "tense", "  ", "hopeful"],
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.fields.moods, ["tense", "hopeful"]);
  });

  it("rejects out-of-range intensity values", () => {
    for (const intensity of [11, -1, 7.5, "7"]) {
      const result = parseSemanticFields({ ...validFields, intensity });
      assert.equal(result.ok, false, `intensity=${String(intensity)} must be rejected`);
    }
  });

  it("rejects empty lists", () => {
    for (const key of ["moods", "themes", "semantic_genres", "audience_descriptors"] as const) {
      const result = parseSemanticFields({ ...validFields, [key]: [] });
      assert.equal(result.ok, false, `${key} must not be empty`);
    }
  });

  it("rejects unknown keys (strict envelope)", () => {
    const result = parseSemanticFields({ ...validFields, quality_score: 9 });
    assert.equal(result.ok, false);
  });

  it("rejects an invalid pacing value", () => {
    const result = parseSemanticFields({ ...validFields, pacing: "brisk" });
    assert.equal(result.ok, false);
  });

  it("rejects non-object payloads", () => {
    assert.equal(parseSemanticFields(null).ok, false);
    assert.equal(parseSemanticFields("[1,2]").ok, false);
    assert.equal(parseSemanticFields("nonsense").ok, false);
  });
});
