"use client";

import { useEffect, useMemo, useState } from "react";

export type SourceHealth = {
  ok: boolean;
  status: number | null;
  ms: number;
};

type HealthMap = Record<string, SourceHealth>;

const CACHE_PREFIX = "oriel:source-health";

function cacheKey(
  type: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number,
) {
  return `${CACHE_PREFIX}:${type}:${tmdbId}:${season ?? 1}:${episode ?? 1}`;
}

function readCache(key: string): { map: HealthMap; until: number } | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { map: HealthMap; until: number };
    if (!parsed.until || parsed.until < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: { map: HealthMap; until: number }) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage unavailable — probe every mount instead.
  }
}

/**
 * Live reachability of every registered source for one title, probed
 * server-side (so datacenter status codes are readable) and cached in the
 * session for a few minutes. Fresh cache entries are read during render;
 * a stale/missing entry triggers one probe per key.
 */
export function useSourceHealth(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number,
): HealthMap {
  const key = cacheKey(type, tmdbId, season, episode);

  const cached = useMemo(
    () => (typeof window === "undefined" ? null : readCache(key)),
    [key],
  );

  // Fetched (this mount) result wins over the cache once present.
  const [fetched, setFetched] = useState<HealthMap | null>(null);
  const [fetchedKey, setFetchedKey] = useState(key);

  // Title changed — drop the previous fetch (render-phase adjustment).
  if (fetchedKey !== key) {
    setFetchedKey(key);
    setFetched(null);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readCache(key)) return; // fresh cache — nothing to do

    let alive = true;

    const qs = new URLSearchParams({
      tmdbId: String(tmdbId),
      type,
      season: String(season ?? 1),
      episode: String(episode ?? 1),
    });

    fetch(`/api/streaming/status?${qs.toString()}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status))),
      )
      .then((data: { results?: HealthMap; cachedUntil?: number }) => {
        if (!alive) return;
        const map = data.results ?? {};
        setFetched(map);
        if (data.cachedUntil) {
          writeCache(key, { map, until: data.cachedUntil });
        }
      })
      .catch(() => {
        // Probe itself failed — no status this time; next mount retries.
      });

    return () => {
      alive = false;
    };
  }, [key, tmdbId, type, season, episode]);

  return fetched ?? cached?.map ?? {};
}
