// Oriel ingestion CLI.
//
// Runs the ingestion pipeline from a Node process (must be executed from the
// app directory with the server-side environment variables loaded). It is a
// convenience wrapper around the same `runIngestion` engine the API route
// uses, so behavior stays identical across entry points.
//
// Usage:
//   node scripts/ingest.ts --source=trending --limit=20
//   node scripts/ingest.ts --source=discover --genreId=18
//   node scripts/ingest.ts --source=popular --limit=50 --minVoteCount=50
//
// Environment:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
//   NEXT_PUBLIC_TMDB_API_KEY                (required, via lib/tmdb.ts)
//
// The script never prints credentials.

import { runIngestion } from "../lib/oriel/ingest";
import { isServerSupabaseConfigured } from "../lib/supabase/server";
import type { DiscoverySource } from "../lib/oriel/types";

type CliArgs = {
  source: DiscoverySource;
  limit: number;
  page: number;
  genreId?: number;
  minVoteCount?: number;
  year?: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    source: "trending",
    limit: 20,
    page: 1,
  };

  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    const val = value?.trim();

    switch (key) {
      case "source":
        if (
          val &&
          ["trending", "popular", "top_rated", "discover"].includes(val)
        ) {
          args.source = val as DiscoverySource;
        }
        break;
      case "limit": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.limit = Math.min(n, 100);
        break;
      }
      case "page": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.page = n;
        break;
      }
      case "genreId": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.genreId = n;
        break;
      }
      case "minVoteCount": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.minVoteCount = n;
        break;
      }
      case "year": {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) args.year = n;
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

  console.log(
    `[oriel] ingesting source=${args.source} limit=${args.limit} page=${args.page}` +
      (args.genreId ? ` genreId=${args.genreId}` : "") +
      (args.minVoteCount ? ` minVoteCount=${args.minVoteCount}` : "") +
      (args.year ? ` year=${args.year}` : "")
  );

  const summary = await runIngestion({
    source: args.source,
    limit: args.limit,
    page: args.page,
    genreId: args.genreId,
    minVoteCount: args.minVoteCount,
    year: args.year,
  });

  console.log();
  console.log("[oriel] ingestion summary");
  console.log("  source          ", summary.source);
  console.log("  requested       ", summary.requested);
  console.log("  discovered      ", summary.discovered);
  console.log("  fetched         ", summary.fetched);
  console.log("  inserted        ", summary.inserted);
  console.log("  updated         ", summary.updated);
  console.log("  skippedInvalid  ", summary.skippedInvalid);
  console.log("  failedFetch     ", summary.failedFetch);
  console.log("  failedWrite     ", summary.failedWrite);

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