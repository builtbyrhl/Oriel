import { NextResponse } from "next/server";

import {
  buildProviderUrl,
  getRankedProviders,
  providerHas,
} from "@/lib/streaming/providers";

const PROBE_TIMEOUT_MS = 3000;
const OVERALL_TIMEOUT_MS = 6500;

type ProbeResult = {
  ok: boolean;
  status: number | null;
  ms: number;
};

async function probe(url: string): Promise<ProbeResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    // Headers-only signal — drop the body so we don't download 20 player pages.
    void res.body?.cancel().catch(() => {});
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      ms: Date.now() - startedAt,
    };
  } catch {
    return { ok: false, status: null, ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Live health of every registered source for one title. Lets the source
 * drawer show which of the many mirrors are reachable right now.
 *
 * Security: URLs are built exclusively from the in-app registry templates
 * (attacker-supplied values fill {{tokens}} only) — never from the request.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const tmdbId = Number(searchParams.get("tmdbId") ?? "0");
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = Math.max(1, Number(searchParams.get("season") ?? "1") || 1);
  const episode = Math.max(1, Number(searchParams.get("episode") ?? "1") || 1);

  if (!Number.isInteger(tmdbId) || tmdbId < 1) {
    return NextResponse.json({ results: {} });
  }

  const providersWithTemplate = getRankedProviders().filter((p) =>
    providerHas(type, p),
  );

  const settled = await Promise.race([
    Promise.all(
      providersWithTemplate.map(async (p) => {
        const url = buildProviderUrl(p, tmdbId, type, season, episode);
        const result = url ? await probe(url) : null;
        return [p.name, result] as const;
      }),
    ),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), OVERALL_TIMEOUT_MS)),
  ]);

  const results: Record<string, ProbeResult> = {};
  if (settled) {
    for (const [name, result] of settled) {
      if (result) results[name] = result;
    }
  }

  return NextResponse.json({
    results,
    // Client-side cache hint: status is a few seconds old at best.
    cachedUntil: Date.now() + 5 * 60 * 1000,
  });
}
