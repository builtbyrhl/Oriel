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

export const STREAM_PROVIDERS: StreamingProvider[] = [
  {
    // Self-hosted proxy (oriel-player/) that returns raw MP4 streams with no
    // ads/trackers. Deploy oriel-player/ to Vercel, then set
    // NEXT_PUBLIC_ORIEL_PLAYER_URL to the deployed origin (no trailing slash).
    name: "vidlink-selfhosted",
    label: "Vidlink (self-hosted)",
    rank: 1,
    movieUrlTemplate:
      (process.env.NEXT_PUBLIC_ORIEL_PLAYER_URL || "") + "/?id={{tmdbId}}",
    seriesUrlTemplate:
      (process.env.NEXT_PUBLIC_ORIEL_PLAYER_URL || "") +
      "/?id={{tmdbId}}&s={{season}}&e={{episode}}",
    description:
      "Self-hosted proxy — ad-free, no trackers, direct MP4 streams.",
  },
  {
    name: "vidsrcme",
    label: "VidSrc.me",
    rank: 2,
    movieUrlTemplate: "https://vidsrc.me/embed/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidsrc.me/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Fast VidSrc mirror.",
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
    description: "VidSrc.sbs embed.",
  },
  {
    name: "vidlink",
    label: "Vidlink",
    rank: 6,
    movieUrlTemplate: "https://vidlink.pro/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidlink.pro/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Open-source, multi-mirror embed.",
  },
  {
    name: "twoembed",
    label: "2Embed.cc",
    rank: 7,
    movieUrlTemplate: "https://www.2embed.cc/embed/{{tmdbId}}",
    seriesUrlTemplate: "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",
    description: "2Embed.cc embed.",
  },
  {
    name: "smashystream",
    label: "SmashyStream",
    rank: 8,
    movieUrlTemplate: "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}",
    seriesUrlTemplate: "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}&season={{season}}&episode={{episode}}",
    description: "SmashyStream embed.",
  },
];

export const DEFAULT_ENABLED = true;

/** Ranked, live providers only. */
export function getRankedProviders(): StreamingProvider[] {
  return STREAM_PROVIDERS.filter((p) => {
    if (!(p.enabled ?? DEFAULT_ENABLED)) return false;
    // Skip self-hosted provider if env var is not configured
    if (p.name === "vidlink-selfhosted") {
      return Boolean(process.env.NEXT_PUBLIC_ORIEL_PLAYER_URL);
    }
    return true;
  }).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

/** True when a provider can serve `kind` content (movie/series). */
export function providerHas(kind: "movie" | "tv", p: StreamingProvider): boolean {
  return Boolean(kind === "movie" ? p.movieUrlTemplate : p.seriesUrlTemplate);
}

/**
 * Renders a provider template for given identifiers. Returns an empty string
 * when the provider can't serve that content type — callers treat "" as
 * "not available" and never render it as a playable source.
 */
export function buildProviderUrl(
  p: StreamingProvider,
  tmdbId: number,
  kind: "movie" | "tv",
  season?: number,
  episode?: number
): string {
  const template = kind === "movie" ? p.movieUrlTemplate : p.seriesUrlTemplate;
  if (!template) return "";

  return template
    .replace("{{tmdbId}}", encodeURIComponent(String(tmdbId)))
    .replace("{{season}}", encodeURIComponent(String(season ?? 1)))
    .replace("{{episode}}", encodeURIComponent(String(episode ?? 1)));
}
