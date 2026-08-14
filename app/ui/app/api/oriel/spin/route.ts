// Oriel Spin API — thin HTTP shell over the Spin engine.
//
//   GET /api/oriel/spin?genre=Horror&mood=Happy&mediaType=movie&limit=20
//
// Query parameters:
//   genre      — case-insensitive genre name (optional, but genre and/or mood)
//   mood       — case-insensitive AI mood, e.g. "Happy" (optional)
//   mediaType  — "movie" | "tv" | "both" (optional, defaults to both)
//   limit      — 1..200 result cap (optional, defaults to 50)
//
// Business logic lives in lib/oriel/curation/spin-api.ts (which drives the
// completed buildSpinSet engine); this file only extracts query params and
// maps the outcome to HTTP. No AI is called during a request, and nothing here
// randomizes or re-ranks the engine's deterministic output.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runSpin } from "@/lib/oriel/curation/spin-api";
import type { DiscoveryDbGateway } from "@/lib/oriel/curation/types";
import type { SpinDetailsGateway } from "@/lib/oriel/curation/spin-api";

export interface SpinRouteOptions {
  /** Test seam: override the production Supabase candidate gateway. */
  db?: DiscoveryDbGateway;
  /** Test seam: override the production detail lookup. */
  details?: SpinDetailsGateway;
}

/**
 * Returns the GET handler wired to the given dependencies. Production uses
 * the default export; tests inject mock gateways.
 */
export function createSpinHandler(options: SpinRouteOptions = {}) {
  return async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;

    const outcome = await runSpin(
      {
        genre: searchParams.get("genre"),
        mood: searchParams.get("mood"),
        mediaType: searchParams.get("mediaType"),
        limit: searchParams.get("limit"),
      },
      { db: options.db, details: options.details }
    );

    return NextResponse.json(outcome.body, { status: outcome.status });
  };
}

export const GET = createSpinHandler();
