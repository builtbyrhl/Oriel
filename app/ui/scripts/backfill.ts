// Oriel enrichment backfill CLI.
//
// Drains the entire enrichment queue for a media type — catalog-wide, across
// as many batches as it takes — rather than a single batch. It wraps the
// same `backfillEnrichment` engine used by tests, and reports catalog
// coverage before and after so you can see how much work remains.
//
// Usage:
//   node scripts/backfill.ts --mediaType=movie
//   node scripts/backfill.ts --mediaType=tv --maxItems=250 --batchSize=20
//
// Environment:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
//   GEMINI_API_KEY or OPENROUTER_API_KEY             (required)
//   ORIEL_AI_PROVIDER=gemini|openrouter              (optional; auto-detect)
//
// Exit codes: 0 = run completed (failures are normal backfill noise), 1 =
// fatal error (bad config or unexpected crash). The script never prints
// credentials.

import { backfillEnrichment, getEnrichmentCoverage } from "../lib/ai/enrich";
import { createAiProvider, isAiConfigured } from "../lib/ai/providers";
import { isServerSupabaseConfigured } from "../lib/supabase/server";
import type { MediaType } from "../lib/oriel/types";

type CliArgs = {
  mediaType: MediaType;
  maxItems: number;
  batchSize: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { mediaType: "movie", maxItems: 500, batchSize: 10 };

  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    const val = value?.trim();

    switch (key) {
      case "mediaType":
        if (val && ["movie", "tv"].includes(val)) {
          args.mediaType = val as MediaType;
        }
        break;
      case "maxItems": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.maxItems = Math.min(n, 5000);
        break;
      }
      case "batchSize": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.batchSize = Math.min(n, 100);
        break;
      }
    }
  }

  return args;
}

function fmtCoverage(mediaType: MediaType, value: { total: number; enriched: number; remaining: number } | null) {
  if (!value) return `  ${mediaType}: no rows`;
  const pct =
    value.total === 0 ? 0 : Math.round((value.enriched / value.total) * 100);
  return `  ${mediaType}: ${value.enriched}/${value.total} enriched (${pct}%), ${value.remaining} remaining`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!isServerSupabaseConfigured()) {
    console.error(
      "[oriel] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set."
    );
    process.exit(1);
  }

  if (!isAiConfigured()) {
    console.error(
      "[oriel] No AI provider configured. Set GEMINI_API_KEY or " +
        "OPENROUTER_API_KEY (and optionally ORIEL_AI_PROVIDER)."
    );
    process.exit(1);
  }

  const provider = createAiProvider();

  const before = await getEnrichmentCoverage(args.mediaType);

  console.log(
    `[oriel] backfilling mediaType=${args.mediaType} maxItems=${args.maxItems} ` +
      `batchSize=${args.batchSize} provider=${provider.name} model=${provider.model}`
  );
  console.log("[oriel] coverage before backfill");
  console.log(fmtCoverage(args.mediaType, before));

  const summary = await backfillEnrichment({
    mediaType: args.mediaType,
    maxItems: args.maxItems,
    batchSize: args.batchSize,
    provider,
    onBatch: (_batch, progress) => {
      console.log(
        `  batch ${progress.batches}: processed=${progress.processed} ` +
          `succeeded=${progress.succeeded} failed=${progress.failed}`
      );
    },
  });

  const after = await getEnrichmentCoverage(args.mediaType);

  console.log();
  console.log("[oriel] backfill summary");
  console.log("  mediaType       ", summary.mediaType);
  console.log("  batches         ", summary.batches);
  console.log("  attempted       ", summary.attempted);
  console.log("  succeeded       ", summary.succeeded);
  console.log("  skipped         ", summary.skipped);
  console.log("  failed          ", summary.failed);
  console.log("  stopped         ", summary.stopped);
  console.log("[oriel] coverage after backfill");
  console.log(fmtCoverage(args.mediaType, after));

  if (summary.errors.length > 0) {
    console.error("\n[oriel] per-item failures (non-fatal):");
    for (const err of summary.errors.slice(0, 20)) {
      console.error("  -", err);
    }
    if (summary.errors.length > 20) {
      console.error(`  ... and ${summary.errors.length - 20} more`);
    }
  }
}

main().catch((err) => {
  console.error("[oriel] fatal:", err);
  process.exit(1);
});
