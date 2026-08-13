// Oriel Discovery API — thin HTTP shell over the curation pipeline.
//
//   GET /api/oriel/discovery?genre=Horror&mood=dark&mediaType=movie&limit=20
//
// Query parameters:
//   genre      — case-insensitive genre name (optional, but genre and/or mood)
//   mood       — case-insensitive AI mood, e.g. "dark" (optional)
//   mediaType  — "movie" | "tv" | "both" (optional, defaults to both)
//   limit      — 1..200 result cap (optional, defaults to 50)
//
// Business logic lives in lib/oriel/curation/discovery-api.ts; this file only
// extracts query params and maps the outcome to HTTP. No AI is called during
// a request, and nothing here is personalized.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runDiscovery } from "@/lib/oriel/curation/discovery-api";
import type { DiscoveryDbGateway } from "@/lib/oriel/curation/types";

export interface DiscoveryRouteOptions {
  /** Test seam: override the production Supabase gateway. */
  db?: DiscoveryDbGateway;
}

/**
 * Returns the GET handler wired to the given dependencies. Production uses
 * the default export; tests inject a mock `DiscoveryDbGateway`.
 */
export function createDiscoveryHandler(options: DiscoveryRouteOptions = {}) {
  return async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    const outcome = await runDiscovery(
      {
        genre: searchParams.get("genre"),
        mood: searchParams.get("mood"),
        mediaType: searchParams.get("mediaType"),
        limit: searchParams.get("limit"),
      },
      { db: options.db }
    );

    return NextResponse.json(outcome.body, { status: outcome.status });
  };
}

export const GET = createDiscoveryHandler();
