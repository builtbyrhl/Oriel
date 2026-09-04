import type { PlaybackContentType, PlaybackProvider } from "./types";
import { getRankedProviders } from "@/lib/streaming/providers";

/**
 * Playback sources shared with the overlay player. Ordered by reliability
 * rank (most reliable first); `enabled` is honoured so a provider can be
 * disabled without editing its template.
 */
export const PLAYBACK_PROVIDERS: PlaybackProvider[] = getRankedProviders().map(
  (p) => ({
    id: p.name,
    name: p.label,
    enabled: p.enabled ?? true,
    movieUrlTemplate: p.movieUrlTemplate,
    seriesUrlTemplate: p.seriesUrlTemplate,
    description: p.description,
  }),
);

export function getPlaybackProviders(
  contentType: PlaybackContentType,
): PlaybackProvider[] {
  const wantMovie = contentType === "movie";

  return PLAYBACK_PROVIDERS.filter((provider) => {
    if (!provider.enabled) return false;
    const template = wantMovie
      ? provider.movieUrlTemplate
      : provider.seriesUrlTemplate;
    return Boolean(template && template.trim());
  });
}
