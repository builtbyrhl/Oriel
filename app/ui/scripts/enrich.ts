// Oriel enrichment CLI.
//
// Runs a small controlled AI enrichment batch from a Node process (must be
// executed from the app directory with server-side env vars loaded). It is a
// convenience wrapper around the same `enrichBatch` engine used by tests, so
// behavior stays identical across entry points.
//
// Usage:
//   node scripts/enrich.ts --mediaType=movie --limit=10
//   node scripts/enrich.ts --mediaType=tv --limit=10
//
// Environment:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
//   GEMINI_API_KEY or OPENROUTER_API_KEY             (required)
//   ORIEL_AI_PROVIDER=gemini|openrouter              (optional; auto-detect)
//
// The script never prints credentials.

import { enrichBatch } from "../lib/ai/enrich";
import { createAiProvider, isAiConfigured } from "../lib/ai/providers";
import { isServerSupabaseConfigured } from "../lib/supabase/server";
import type { MediaType } from "../lib/oriel/types";

type CliArgs = {
  mediaType: MediaType;
  limit: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { mediaType: "movie", limit: 10 };

  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    const val = value?.trim();

    switch (key) {
      case "mediaType":
        if (val && ["movie", "tv"].includes(val)) {
          args.mediaType = val as MediaType;
        }
        break;
      case "limit": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.limit = Math.min(n, 100);
        break;
      }
    }
  }

  return args;
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

  console.log(
    `[oriel] enriching mediaType=${args.mediaType} limit=${args.limit} ` +
      `provider=${provider.name} model=${provider.model}`
  );

  const summary = await enrichBatch({
    mediaType: args.mediaType,
    limit: args.limit,
    provider,
  });

  console.log();
  console.log("[oriel] enrichment summary");
  console.log("  mediaType       ", summary.mediaType);
  console.log("  requested       ", summary.requested);
  console.log("  attempted       ", summary.attempted);
  console.log("  succeeded       ", summary.succeeded);
  console.log("  skipped         ", summary.skipped);
  console.log("  failed          ", summary.failed);

  if (summary.errors.length > 0) {
    console.error("\n[oriel] errors:");
    for (const err of summary.errors) {
      console.error("  -", err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[oriel] fatal:", err);
  process.exit(1);
});
