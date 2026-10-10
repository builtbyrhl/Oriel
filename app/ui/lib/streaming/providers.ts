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
  // ——— Extended catalog (secondary tier) ———
  // Hidden behind the "+N more" drawer. Each is live-probed by
  // /api/streaming/status and shown with a status dot; mirrors that are
  // unreachable from the edge simply sort to the bottom as "down".
  {
    name: "vidsrcme",
    label: "VidSrc.me",
    rank: 100,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.me/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.me/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcnew",
    label: "VidSrc.new",
    rank: 101,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.new/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.new/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrclo",
    label: "VidSrc.lol",
    rank: 102,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.lol/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.lol/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcto",
    label: "VidSrc.to",
    rank: 103,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.to/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.to/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrchomes",
    label: "VidSrc.homes",
    rank: 104,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.homes/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.homes/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcpw",
    label: "VidSrc.pw",
    rank: 105,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.pw/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.pw/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcfun",
    label: "VidSrc.fun",
    rank: 106,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.fun/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.fun/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcbest",
    label: "VidSrc.best",
    rank: 107,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.best/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.best/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcasia",
    label: "VidSrc.asia",
    rank: 108,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.asia/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.asia/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "vidsrcfish",
    label: "VidSrc.fish",
    rank: 109,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.fish/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.fish/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc mirror.",
  },
  {
    name: "multiembed",
    label: "MultiEmbed",
    rank: 110,
    tier: "secondary",
    movieUrlTemplate: "https://www.multiembed.mov/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://www.multiembed.mov/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "MultiEmbed mirror.",
  },
  {
    name: "twoembedwiki",
    label: "2Embed.wiki",
    rank: 111,
    tier: "secondary",
    movieUrlTemplate: "https://www.2embed.wiki/embed/{{tmdbId}}",
    seriesUrlTemplate: "https://www.2embed.wiki/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",
    description: "2Embed mirror.",
  },
];

/**
 * Ranked sources split by tier. Primary is the curated default row;
 * secondary is the extended catalog shown behind "+N more" with live
 * status. Both keep rank order (primary first, then secondary).
 */
export function getTieredProviders(): {
  primary: StreamingProvider[];
  secondary: StreamingProvider[];
} {
  const ranked = getRankedProviders();
  return {
    primary: ranked.filter((p) => (p.tier ?? "primary") === "primary"),
    secondary: ranked.filter((p) => p.tier === "secondary"),
  };
}