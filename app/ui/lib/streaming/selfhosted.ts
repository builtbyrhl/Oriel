"use client";

// Self-hosted proxy health. A Vercel deployment that died / expired stops
// serving `/health` (or bounce-redirects to the dashboard), so a quick
// cross-origin probe reliably tells us "don't send the user there". Results
// are cached per-origin for 5 minutes in sessionStorage to avoid probing on
// every open. Unknown (first probe in progress) is treated as healthy so the
// default source shows immediately rather than a blank player.

const HEALTH_TTL_MS = 5 * 60 * 1000;
const PROBE_TIMEOUT_MS = 6000;

export function selfhostedOrigin(): string {
  return (process.env.NEXT_PUBLIC_ORIEL_PLAYER_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
}

function cacheKey(origin: string): string {
  return "oriel:selfhosted:health:" + origin.replace(/^https?:\/\//, "");
}

export async function probeSelfhosted(origin: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(origin + "/health", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkSelfhostedHealth(origin: string): Promise<boolean> {
  try {
    const cached = window.sessionStorage.getItem(cacheKey(origin));
    if (cached) {
      const [ts, ok] = cached.split(":");
      if (Number(ts) && Date.now() - Number(ts) < HEALTH_TTL_MS) {
        return ok === "1";
      }
    }
  } catch {
    // sessionStorage unavailable (Safari private) — fall through to probe.
  }
  const ok = await probeSelfhosted(origin);
  try {
    window.sessionStorage.setItem(cacheKey(origin), `${Date.now()}:${ok ? "1" : "0"}`);
  } catch {
    // Ignore write failures.
  }
  return ok;
}
