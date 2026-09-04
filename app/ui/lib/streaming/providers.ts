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
    name: "vidlink",
    label: "Vidlink",
    rank: 1,
    // Open-source + self-hostable; the most durable option since the domain(s)
    // are community run rather than a single fly-by-night host.
    movieUrlTemplate: "https://vidlink.pro/movie/{{tmdbId}}",
    seriesUrlTemplate: "https://vidlink.pro/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "Open-source, multi-mirror embed.",
  },
  {
    name: "vidsrcxyz",
    label: "VidSrc.xyz",
    rank: 2,
    movieUrlTemplate: "https://vidsrc.xyz/embed/movie?tmdb={{tmdbId}}",
    seriesUrlTemplate:
      "https://vidsrc.xyz/embed/tv?tmdb={{tmdbId}}&season={{season}}&episode={{episode}",
    description: "VidSrc.xyz embed.",
  },
  {
    name: "vidsrccc",
    label: "VidSrc.cc",
    rank: 3,
    movieUrlTemplate: "https://vidsrc.cc/v2/embed/movie/{{tmdbId}}",
    seriesUrlTemplate:
      "https://vidsrc.cc/v2/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.cc embed.",
  },
  {
    name: "vidsrcsbs",
    label: "VidSrc.sbs",
    rank: 4,
    movieUrlTemplate: "https://vidsrc.sbs/embed/movie/{{tmdbId}}",
    seriesUrlTemplate:
      "https://vidsrc.sbs/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
    description: "VidSrc.sbs embed.",
  },
  {
    name: "twoembed",
    label: "2Embed.cc",
    rank: 5,
    movieUrlTemplate: "https://www.2embed.cc/embed/{{tmdbId}}",
    seriesUrlTemplate:
      "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}",
    description: "2Embed.cc embed.",
  },
  {
    name: "smashystream",
    label: "SmashyStream",
    rank: 6,
    movieUrlTemplate: "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}",
    seriesUrlTemplate:
      "https://embed.smashystream.com/playere.php?tmdb={{tmdbId}}&season={{season}}&episode={{episode}",
    description: "SmashyStream embed.",
  },
];

export const DEFAULT_ENABLED = true;

/** Ranked, live providers only. */
export function getRankedProviders(): StreamingProvider[] {
  return STREAM_PROVIDERS.filter(
    (p) => p.enabled ?? DEFAULT_ENABLED
  ).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
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
