#!/usr/bin/env node
// Oriel catalogue expansion worker — development runner.
//
// A standalone Node process (no Next.js) that grows the persistent Oriel
// catalogue and then drains the AI enrichment queue:
//
//   1. loads `.env.local` (worker/env.ts — Next.js does not load it for
//      plain Node processes);
//   2. expansion pass — `runExpansion` walks a prioritized TMDB plan
//      (trending -> popular -> top-rated -> per-genre), ingesting only what
//      is missing (skipExisting + within-run tracking) until the target
//      catalogue size is reached or the plan is exhausted;
//   3. enrichment pass — `backfillEnrichment` drains the enrichment queue for
//      each media type using the existing retry/backoff.
//
// The engine functions are exactly what a persistent background worker would
// call, so moving off the Codespace later needs no API changes — a long-lived
// process would just loop passes 2/3 with a sleep.
//
// Usage:
//   npx tsx worker/catalogue-worker.ts --target=5000
//   npx tsx worker/catalogue-worker.ts --target=10000 --mediaType=tv \
//     --popularDepth=50 --genreDepth=10 --enrichCap=250
//
// Exit codes: 0 = pass completed, 1 = fatal error (bad config or crash).
// The worker never prints credentials.

import { loadEnvFile } from "./env";

loadEnvFile();

type CliArgs = {
  target: number;
  mediaType: "both" | "movie" | "tv";
  popularDepth: number;
  genreDepth: number;
  minVoteCount?: number;
  enrichBatch: number;
  enrichCap: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    target: 5000,
    mediaType: "both",
    popularDepth: 25,
    genreDepth: 5,
    minVoteCount: undefined,
    enrichBatch: 10,
    enrichCap: 500,
  };

  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    const val = value?.trim();

    switch (key) {
      case "target": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.target = n;
        break;
      }
      case "mediaType":
        if (val && ["both", "movie", "tv"].includes(val)) {
          args.mediaType = val as CliArgs["mediaType"];
        }
        break;
      case "popularDepth": {
        const n = Number(val);
        if (Number.isFinite(n) && n >= 0) args.popularDepth = n;
        break;
      }
      case "genreDepth": {
        const n = Number(val);
        if (Number.isFinite(n) && n >= 0) args.genreDepth = n;
        break;
      }
      case "minVoteCount": {
        const n = Number(val);
        if (Number.isFinite(n) && n >= 0) args.minVoteCount = n;
        break;
      }
      case "enrichBatch": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.enrichBatch = Math.min(n, 100);
        break;
      }
      case "enrichCap": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.enrichCap = n;
        break;
      }
    }
  }

  return args;
}

async function catalogueSize(mediaTypes: string[]): Promise<number> {
  const { getEnrichmentCoverage } = await import("../lib/ai/enrich");
  let total = 0;

  for (const mediaType of mediaTypes) {
    try {
      const coverage = await getEnrichmentCoverage(mediaType as "movie" | "tv");
      total += coverage?.total ?? 0;
    } catch {
      // Coverage view/RPC unavailable — treat as an empty catalogue.
    }
  }

  return total;
}

async function runEnrichmentPass(
  args: CliArgs,
  mediaTypes: Array<"movie" | "tv">
): Promise<void> {
  const [{ createAiProvider }, { backfillEnrichment, getEnrichmentCoverage }] =
    await Promise.all([
      import("../lib/ai/providers"),
      import("../lib/ai/enrich"),
    ]);

  const provider = createAiProvider();

  for (const mediaType of mediaTypes) {
    const before = await getEnrichmentCoverage(mediaType);

    console.log(
      `[oriel] enrichment pass mediaType=${mediaType} batchSize=${args.enrichBatch} ` +
        `cap=${args.enrichCap} provider=${provider.name} model=${provider.model}`
    );

    if (!before || before.remaining === 0) {
      console.log(`[oriel]   nothing to enrich (already complete)`);
      continue;
    }

    const summary = await backfillEnrichment({
      mediaType,
      batchSize: args.enrichBatch,
      maxItems: args.enrichCap,
      provider,
      onBatch: (_batch, progress) => {
        console.log(
          `[oriel]   batch ${progress.batches}: processed=${progress.processed} ` +
            `succeeded=${progress.succeeded} failed=${progress.failed}`
        );
      },
    });

    const after = await getEnrichmentCoverage(mediaType);

    console.log(
      `[oriel]   done: succeeded=${summary.succeeded} skipped=${summary.skipped} ` +
        `failed=${summary.failed} (${summary.stopped}) ` +
        `coverage ${before.enriched}/${before.total} -> ${after?.enriched ?? 0}/${after?.total ?? before.total}`
    );

    if (summary.errors.length > 0) {
      console.error(
        `[oriel]   ${summary.errors.length} per-item failures (non-fatal):`
      );
      for (const err of summary.errors.slice(0, 10)) {
        console.error("    -", err);
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const [{ isServerSupabaseConfigured }, { isAiConfigured }] =
    await Promise.all([
      import("../lib/supabase/server"),
      import("../lib/ai/providers"),
    ]);

  if (!isServerSupabaseConfigured()) {
    console.error(
      "[oriel] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set."
    );
    process.exit(1);
  }

  if (!isAiConfigured()) {
    console.error(
      "[oriel] No AI provider configured. Set GEMINI_API_KEY (and optionally " +
        "GEMINI_API_KEY_2..N or GEMINI_API_KEYS) or OPENROUTER_API_KEY."
    );
    process.exit(1);
  }

  const mediaTypes: Array<"movie" | "tv"> =
    args.mediaType === "both" ? ["movie", "tv"] : [args.mediaType];

  const currentTotal = await catalogueSize(mediaTypes);
  const remaining = Math.max(0, args.target - currentTotal);

  console.log(
    `[oriel] catalogue worker target=${args.target} mediaType=${args.mediaType}`
  );
  console.log(`[oriel] current catalogue: ${currentTotal} items`);

  // -------------------------------------------------------------------------
  // Expansion pass
  // -------------------------------------------------------------------------

  if (remaining === 0) {
    console.log("[oriel] target already reached — skipping expansion");
  } else {
    const { runExpansion } = await import("../lib/oriel/expansion");

    console.log(
      `[oriel] expanding by up to ${remaining} items ` +
        `(popularDepth=${args.popularDepth} genreDepth=${args.genreDepth} ` +
        `minVoteCount=${args.minVoteCount ?? "any"})`
    );

    const summary = await runExpansion({
      mediaTypes,
      target: remaining,
      pageDepth: { popular: args.popularDepth, genre: args.genreDepth },
      minVoteCount: args.minVoteCount,
      onStep: (step, stepSummary, totals) => {
        console.log(
          `[oriel]   ${step.source}${step.genreId ? ` genre=${step.genreId}` : ""} ` +
            `page=${step.page} ${step.mediaType}: ` +
            `inserted=${totals.inserted} fetched=${totals.fetched} ` +
            `skipped=${totals.skippedExisting} (step: ${stepSummary.inserted} new)`
        );
      },
    });

    console.log(
      `[oriel] expansion pass complete: steps=${summary.totals.steps} ` +
        `new=${summary.totals.inserted} updated=${summary.totals.updated} ` +
        `skippedExisting=${summary.totals.skippedExisting} ` +
        `failed=${summary.totals.failedFetch + summary.totals.failedWrite} ` +
        `targetReached=${summary.reached}`
    );

    if (!summary.reached) {
      console.log(
        "[oriel]   plan exhausted before target — re-run to continue, or raise " +
          "popularDepth/genreDepth for a deeper sweep."
      );
    }
  }

  // -------------------------------------------------------------------------
  // Enrichment pass
  // -------------------------------------------------------------------------

  await runEnrichmentPass(args, mediaTypes);

  const newTotal = await catalogueSize(mediaTypes);
  console.log(`[oriel] catalogue now: ${newTotal} items`);

  console.log(
    `[oriel] done. Re-run to resume (idempotent). A persistent background ` +
      `worker would loop expansion + enrichment passes with a sleep between.`
  );
}

main().catch((err) => {
  console.error("[oriel] fatal:", err);
  process.exit(1);
});
