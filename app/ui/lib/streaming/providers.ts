// Canonical streaming-provider registry.
//
// One source of truth for every embed this app uses, ranked by reliability
// priority (`rank`: 1 = default/tried-first, larger = fallback). Both the
// overlay player (getStream) and the inline player (getPlaybackProviders) read
// this list and apply the same ordering, so "most reliable by default" is
// true for both surfaces.
//
// Re-order `rank` as you observe real uptime — no other code hard-codes an
// ordering. The discovery API requires TMDB id; these templates all key off it.
// All are HTTPS iframes; new embed owners can slot in here.

import type { StreamingProvider } from "./types";

/**
 * Ranked, ready-to-serve sources. Disabled providers and providers without a
 * usable URL template are omitted — we never hand a broken source to the
 * player. Returned ranks are always dense 1..N in serve order, so
 * "first = most reliable" always holds.
 */
export function getRankedProviders(): StreamingProvider[] {
  const ordered = STREAM_PROVIDERS.filter((p) => {
    if (p.enabled === false) return false;
    return Boolean(p.movieUrlTemplate || p.seriesUrlTemplate);
  }).sort((a, b) => a.rank - b.rank);
  return ordered.map((p, i) => ({ ...p, rank: i + 1 }));
}

export function providerHas(type: "movie" | "tv", p: StreamingProvider): boolean {
  return type === "movie" ? Boolean(p.movieUrlTemplate) : Boolean(p.seriesUrlTemplate);
}

export function buildProviderUrl(
  p: StreamingProvider,
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number,
): string {
  const template = type === "movie" ? p.movieUrlTemplate : p.seriesUrlTemplate;
  if (!template) return "";
  return template
    .replace(/{{tmdbId}}/g, String(tmdbId))
    .replace(/{{season}}/g, String(season))
    .replace(/{{episode}}/g, String(episode));
}

export const STREAM_PROVIDERS: StreamingProvider[] = [
  {
    name: "vidlink",
    label: "Vidlink",
    rank: 1,
    movieUrlTemplate: "https://vidlink.pro/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidlink.pro/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Open-source, multi-mirror embed.",
  },
  {
    name: "vidsrcio",
    label: "VidSrc.io",
    rank: 2,
    movieUrlTemplate: "https://vidsrc.io/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.io/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.io mirror.",
  },
  {
    name: "twoembed",
    label: "2Embed.cc",
    rank: 3,
    movieUrlTemplate: "https://www.2embed.cc/embed/{{tmdbId}}",
    seriesUrlTemplate: "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",
    description: "2Embed.cc embed — strong anime + cartoon coverage.",
  },
  {
    name: "vidsrcv2",
    label: "VidSrc.v2",
    rank: 4,
    movieUrlTemplate: "https://v2.vidsrc.me/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://v2.vidsrc.me/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc v2 mirror.",
  },
  {
    name: "vidsrcwiki",
    label: "VidSrc.wiki",
    rank: 5,
    // 301s to a trailing-slash URL — include the slash to skip the hop.
    movieUrlTemplate: "https://vidsrc.wiki/embed/movie/{{tmdbId}}/",
    seriesUrlTemplate: "https://vidsrc.wiki/embed/tv/{{tmdbId}}/{{season}}/{{episode}}/",
    description: "VidSrc.wiki mirror.",
  },
  {
    name: "vidsrcbz",
    label: "VidSrc.bz",
    rank: 6,
    movieUrlTemplate: "https://vidsrc.bz/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.bz/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.bz mirror.",
  },
  {
    name: "vidsrcpm",
    label: "Vidflix",
    rank: 7,
    movieUrlTemplate: "https://vidsrc.pm/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.pm/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Vidflix (vidsrc.pm) embed.",
  },
];