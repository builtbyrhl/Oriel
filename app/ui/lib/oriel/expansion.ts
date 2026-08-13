// Oriel Media Data Engine — catalogue expansion.
//
// A thin orchestration layer over `runIngestion` that grows the persistent
// catalogue toward a target size without ever re-fetching or duplicating
// work that is already done:
//
//   * a *plan* is an ordered list of TMDB discovery steps, prioritizing the
//     most useful/popular titles first and adding per-genre sweeps so the
//     catalogue has broad genre (and therefore mood) coverage;
//   * each step runs the existing idempotent ingestion pipeline with
//     `skipExisting` enabled, and the engine additionally tracks what it has
//     already ingested *within the current run* so overlapping steps never
//     fetch the same title twice;
//   * the engine is resumable by construction — re-running it continues from
//     where the catalogue stopped, and raising `pageDepth` grows it further.
//
// The engine is dependency-injected and imports nothing UI-specific, so the
// same functions can be driven by the dev worker or a persistent background
// worker without architectural changes.

import {
  DEFAULT_BATCH_SIZE,
  runIngestion,
  resolveIngestionDeps,
} from "./ingest";
import type {
  DiscoverySource,
  IngestionSummary,
  MediaType,
  MovieDbGateway,
  TmdbGateway,
} from "./types";

// ---------------------------------------------------------------------------
// Plan building
// ---------------------------------------------------------------------------

/** How many TMDB pages (20 titles each) to walk per tier. */
export interface PageDepth {
  trending: number;
  topRated: number;
  popular: number;
  genre: number;
}

export const DEFAULT_PAGE_DEPTH: PageDepth = {
  trending: 1,
  topRated: 1,
  popular: 25,
  genre: 5,
};

/** How many *new* items a single expansion run should try to add. */
export const DEFAULT_EXPANSION_TARGET = 1000;

/** The TMDB genre ids Oriel covers for each media type. */
export const MOVIE_GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 878, 10749, 53,
  10752, 37,
];
export const TV_GENRE_IDS = [
  10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766,
  10767, 10768, 10770,
];

/** One discoverable TMDB query within an expansion plan. */
export interface ExpansionStep {
  mediaType: MediaType;
  source: DiscoverySource;
  page: number;
  genreId?: number;
  minVoteCount?: number;
  limit?: number;
}

export interface BuildExpansionPlanOptions {
  mediaType: MediaType;
  pageDepth?: Partial<PageDepth>;
  genreIds?: number[];
  minVoteCount?: number;
}

/**
 * Builds an ordered discovery plan for one media type. The order reflects
 * value for the product: fresh trending titles, then broadly popular titles,
 * then top-rated classics, then per-genre sweeps for coverage. Later steps
 * overlap heavily with earlier ones; the runner's within-run tracking keeps
 * that from costing extra detail fetches.
 */
export function buildExpansionPlan(
  options: BuildExpansionPlanOptions
): ExpansionStep[] {
  const depth: PageDepth = { ...DEFAULT_PAGE_DEPTH, ...options.pageDepth };
  const genreIds =
    options.genreIds ??
    (options.mediaType === "tv" ? TV_GENRE_IDS : MOVIE_GENRE_IDS);

  const base: ExpansionStep = {
    mediaType: options.mediaType,
    source: "discover",
    page: 1,
    minVoteCount: options.minVoteCount,
    limit: DEFAULT_BATCH_SIZE,
  };

  const steps: ExpansionStep[] = [];

  for (let page = 1; page <= depth.trending; page += 1) {
    steps.push({ ...base, source: "trending", page });
  }

  for (let page = 1; page <= depth.topRated; page += 1) {
    steps.push({ ...base, source: "top_rated", page });
  }

  for (let page = 1; page <= depth.popular; page += 1) {
    steps.push({ ...base, source: "discover", page });
  }

  for (const genreId of genreIds) {
    for (let page = 1; page <= depth.genre; page += 1) {
      steps.push({ ...base, source: "discover", page, genreId });
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Within-run tracking
// ---------------------------------------------------------------------------

export interface ExpansionStepResult {
  step: ExpansionStep;
  summary: IngestionSummary;
}

export interface ExpansionTotals {
  steps: number;
  requested: number;
  discovered: number;
  skippedExisting: number;
  fetched: number;
  inserted: number;
  updated: number;
  failedFetch: number;
  failedWrite: number;
  errors: string[];
}

export interface ExpansionSummary {
  mediaTypes: MediaType[];
  target: number;
  /** Whether cumulative new inserts reached `target`. */
  reached: boolean;
  totals: ExpansionTotals;
  steps: ExpansionStepResult[];
}

export interface ExpansionOptions {
  mediaType?: MediaType;
  mediaTypes?: MediaType[];
  /** New items this run should try to add (default DEFAULT_EXPANSION_TARGET). */
  target?: number;
  pageDepth?: Partial<PageDepth>;
  genreIds?: Record<MediaType, number[]>;
  minVoteCount?: number;
  concurrency?: number;
  /** Safety cap on steps executed in one run. */
  maxSteps?: number;
  tmdb?: TmdbGateway;
  db?: MovieDbGateway;
  onStep?: (step: ExpansionStep, summary: IngestionSummary, totals: ExpansionTotals) => void;
}

const EMPTY_TOTALS: ExpansionTotals = {
  steps: 0,
  requested: 0,
  discovered: 0,
  skippedExisting: 0,
  fetched: 0,
  inserted: 0,
  updated: 0,
  failedFetch: 0,
  failedWrite: 0,
  errors: [],
};

function mergeTotals(target: ExpansionTotals, summary: IngestionSummary): void {
  target.steps += 1;
  target.requested += summary.requested;
  target.discovered += summary.discovered;
  target.skippedExisting += summary.skippedExisting;
  target.fetched += summary.fetched;
  target.inserted += summary.inserted;
  target.updated += summary.updated;
  target.failedFetch += summary.failedFetch;
  target.failedWrite += summary.failedWrite;
  target.errors.push(...summary.errors);
}

/**
 * Wraps a database gateway so that titles ingested earlier in the same run
 * are reported as "existing" for later steps. Without this, overlapping plan
 * steps (a popular title that also shows up in a genre sweep) would be
 * re-fetched from TMDB within a single run.
 */
export function withWithinRunTracking(
  db: MovieDbGateway
): { db: MovieDbGateway; seen: Set<string> } {
  const seen = new Set<string>();

  return {
    db: {
      async existingTmdbIds(ids: number[], mediaType: MediaType) {
        const existing = await db.existingTmdbIds(ids, mediaType);

        for (const id of ids) {
          if (seen.has(`${mediaType}:${id}`)) existing.add(id);
        }

        return existing;
      },

      async upsertMovies(records) {
        for (const record of records) {
          seen.add(`${record.media_type}:${record.tmdb_id}`);
        }

        return db.upsertMovies(records);
      },
    },
    seen,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Runs an expansion sweep: walks the plan for each media type, ingesting with
 * `skipExisting` and within-run tracking, and stops once `target` new items
 * have been added or the plan is exhausted.
 *
 * Safe to call repeatedly — it only adds what is missing and never rewrites
 * scoring, discovery, or enrichment behavior.
 */
export async function runExpansion(
  options: ExpansionOptions = {}
): Promise<ExpansionSummary> {
  const deps = resolveIngestionDeps({ tmdb: options.tmdb, db: options.db });
  const mediaTypes: MediaType[] = options.mediaType
    ? [options.mediaType]
    : options.mediaTypes ?? ["movie", "tv"];

  const target = Math.max(1, options.target ?? DEFAULT_EXPANSION_TARGET);
  const concurrency = options.concurrency;
  const maxSteps = options.maxSteps ?? 2000;

  const totals: ExpansionTotals = { ...EMPTY_TOTALS };
  const steps: ExpansionStepResult[] = [];
  const { db: trackingDb } = withWithinRunTracking(deps.db);

  for (const mediaType of mediaTypes) {
    const plan = buildExpansionPlan({
      mediaType,
      pageDepth: options.pageDepth,
      genreIds: options.genreIds?.[mediaType],
      minVoteCount: options.minVoteCount,
    });

    for (const step of plan) {
      if (totals.inserted >= target || steps.length >= maxSteps) break;

      const summary = await runIngestion({
        source: step.source,
        mediaType,
        page: step.page,
        genreId: step.genreId,
        minVoteCount: step.minVoteCount,
        limit: step.limit ?? DEFAULT_BATCH_SIZE,
        skipExisting: true,
        concurrency,
        tmdb: deps.tmdb,
        db: trackingDb,
      });

      steps.push({ step, summary });
      mergeTotals(totals, summary);

      if (options.onStep) {
        options.onStep(step, summary, {
          ...totals,
          errors: [],
        });
      }
    }

    if (totals.inserted >= target) break;
  }

  return {
    mediaTypes,
    target,
    reached: totals.inserted >= target,
    totals,
    steps,
  };
}
