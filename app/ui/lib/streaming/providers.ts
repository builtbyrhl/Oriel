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
// All are HTTPS iframes; authorized/self-hosted embed owners can slot in here.

import type { StreamingProvider } from "./types";

const ORIEL_PLAYER_ORIGIN = process.env.NEXT_PUBLIC_ORIEL_PLAYER_URL ?? "";
const SELFHOSTED_NAME = "vidlink-selfhosted";

/**
 * Ranked, ready-to-serve sources. The self-hosted proxy is only included while
 * its origin is configured — without it it would 404, and we never hand a
 * broken source to the player. When it IS configured it is promoted above
 * every iframe embed (raw MP4, zero ads, nothing detectable) and becomes the
 * default. Returned ranks are always dense 1..N in serve order, so
 * "first = most reliable" holds in both states.
 */
export function getRankedProviders(): StreamingProvider[] {
  const selfhostedLive = ORIEL_PLAYER_ORIGIN.trim().length > 0;
  const ordered = STREAM_PROVIDERS.filter((p) => {
    if (p.enabled === false) return false;
    if (p.name === SELFHOSTED_NAME) return selfhostedLive;
    return Boolean(p.movieUrlTemplate || p.seriesUrlTemplate);
  }).sort((a, b) => {
    if (selfhostedLive) {
      if (a.name === SELFHOSTED_NAME) return -1;
      if (b.name === SELFHOSTED_NAME) return 1;
    }
    return a.rank - b.rank;
  });
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

const selfhostedMovieTemplate = (origin: string) =>
  origin ? `${origin}/?id={{tmdbId}}` : "";
const selfhostedSeriesTemplate = (origin: string) =>
  origin
    ? `${origin}/?id={{tmdbId}}&s={{season}}&e={{episode}}`
    : "";

export const STREAM_PROVIDERS: StreamingProvider[] = [
  {
    // Self-hosted proxy (oriel-player/) — plays the raw MP4 in a native
    // <video> tag. Ours, same origin, never sandboxed: zero ads, zero
    // trackers, nothing detectable. Lives at the bottom of the stored list;
    // `getRankedProviders` lifts it to the top only while
    // NEXT_PUBLIC_ORIEL_PLAYER_URL points at a deployed proxy, and otherwise
    // omits it so it never surfaces as a dead source.
    name: SELFHOSTED_NAME,
    label: "Vidlink (self-hosted)",
    rank: 100,
    movieUrlTemplate: selfhostedMovieTemplate(ORIEL_PLAYER_ORIGIN),
    seriesUrlTemplate: selfhostedSeriesTemplate(ORIEL_PLAYER_ORIGIN),
    description:
      "Self-hosted proxy — ad-free, no trackers, direct MP4 streams.",
  },
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
    rank: 3,
    movieUrlTemplate: "https://vidsrc.io/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.io/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.io mirror.",
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
    name: "vidsrcsbs",
    label: "VidSrc.sbs",
    rank: 5,
    movieUrlTemplate: "https://vidsrc.sbs/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.sbs/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.sbs mirror.",
  },
  {
    name: "vidsrcpm",
    label: "VidSrc.pm",
    rank: 6,
    movieUrlTemplate: "https://vidsrc.pm/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.pm/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.pm mirror.",
  },
  {
    name: "vidsrcbz",
    label: "VidSrc.bz",
    rank: 7,
    movieUrlTemplate: "https://vidsrc.bz/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.bz/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.bz mirror.",
  },
  {
    name: "twoembed",
    label: "2Embed.cc",
    rank: 8,
    movieUrlTemplate: "https://www.2embed.cc/embed/{{tmdbId}}",
    seriesUrlTemplate: "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",
    description: "2Embed.cc embed.",
  },
  {
    name: "smashystream",
    label: "SmashyStream",
    rank: 9,
    movieUrlTemplate: "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}",
    seriesUrlTemplate: "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}&season={{season}}&episode={{episode}}",
    description: "SmashyStream embed.",
  },
];