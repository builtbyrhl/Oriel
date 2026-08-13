// Protected server-side ingestion route.
//
// Mutates the database via the service-role Supabase client. This route:
//   * runs entirely on the server (never bundles service-role credentials for
//     the browser)
//   * requires a shared ingestion token (`ORIEL_INGESTION_TOKEN`) so it cannot
//     be abused as an unrestricted public database-write endpoint
//   * refuses to run when the token is unset (fail-closed)
//
// When real authentication lands in Oriel, replace the shared-token check
// with a session/role guard — the write surface stays server-only either way.

import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/oriel/ingest";
import type { DiscoverySource } from "@/lib/oriel/types";

const INGESTION_TOKEN = process.env.ORIEL_INGESTION_TOKEN;

const VALID_SOURCES: DiscoverySource[] = [
  "trending",
  "popular",
  "top_rated",
  "discover",
];

function parsePositiveInt(raw: unknown, fallback: number | null): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return fallback;

  const parsed = Number.parseInt(String(raw), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return parsed;
}

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(request: Request) {
  // Fail closed if the ingestion token is not configured.
  if (!INGESTION_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Ingestion is not enabled: ORIEL_INGESTION_TOKEN is not configured.",
      },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${INGESTION_TOKEN}`) {
    return unauthorized("Missing or invalid ingestion token.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const payload = body as {
    source?: unknown;
    limit?: unknown;
    page?: unknown;
    genreId?: unknown;
    minVoteCount?: unknown;
    year?: unknown;
  };

  const source = payload?.source as DiscoverySource;

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      {
        error: `source must be one of: ${VALID_SOURCES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const limit = parsePositiveInt(payload?.limit, 20);
  const page = parsePositiveInt(payload?.page, 1);
  const genreId = parsePositiveInt(payload?.genreId, null);
  const minVoteCount = parsePositiveInt(payload?.minVoteCount, null);
  const year = parsePositiveInt(payload?.year, null);

  try {
    const summary = await runIngestion({
      source,
      limit: limit ?? 20,
      page: page ?? 1,
      genreId: genreId ?? undefined,
      minVoteCount: minVoteCount ?? undefined,
      year: year ?? undefined,
    });

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Ingestion failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}