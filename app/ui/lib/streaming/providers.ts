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
    name: "twoembed",
    label: "2Embed",
    rank: 2,
    movieUrlTemplate: "https://www.2embed.cc/embed/{{tmdbId}}",
    seriesUrlTemplate: "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",
    description: "2Embed embed — strong anime + cartoon coverage.",
  },
  {
    name: "vidsrcv2",
    label: "VidSrc",
    rank: 3,
    movieUrlTemplate: "https://v2.vidsrc.me/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://v2.vidsrc.me/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc embed.",
  },
  // ——— Backup shelf (secondary tier) ———
  // Same three brands' redundant mirrors, all verified alive today. Shown
  // as a green-dot shelf behind "All N sources" so depth never means
  // noise. Dead mirrors are simply not registered (see the git history for
  // the retired .new/.lol/.to/.homes/.pw/.fun/.best/.asia/.fish/.wiki
  // clones and the defunct MultiEmbed/2Embed.wiki hosts).
  {
    name: "vidsrcio",
    label: "VidSrc.io",
    rank: 4,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.io/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.io/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.io mirror.",
  },
  {
    name: "vidsrcbz",
    label: "VidSrc.bz",
    rank: 5,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.bz/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.bz/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.bz mirror.",
  },
  {
    name: "vidsrcpm",
    label: "Vidflix",
    rank: 6,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.pm/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.pm/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Vidflix (vidsrc.pm) embed.",
  },
  {
    name: "vidsrcwiki",
    label: "VidSrc.wiki",
    rank: 7,
    tier: "secondary",
    // 301s to a trailing-slash URL — include the slash to skip the hop.
    movieUrlTemplate: "https://vidsrc.wiki/embed/movie/{{tmdbId}}/",
    seriesUrlTemplate: "https://vidsrc.wiki/embed/tv/{{tmdbId}}/{{season}}/{{episode}}/",
    description: "VidSrc.wiki mirror.",
  },
  {
    name: "vidsrcme",
    label: "VidSrc.me",
    rank: 8,
    tier: "secondary",
    movieUrlTemplate: "https://vidsrc.me/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.me/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.me mirror.",
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