import type { MediaType, StreamResult, StreamSource } from "./types";
import { providers } from "./providers";

interface GetStreamArgs {
  tmdbId: number;
  type: MediaType;
  season?: number;
  episode?: number;
}

export function getStream({
  tmdbId,
  type,
  season = 1,
  episode = 1,
}: GetStreamArgs): StreamResult {
  const sources: StreamSource[] = providers.map((p) => ({
    provider: p.name,
    label: p.label,
    url:
      type === "movie"
        ? p.buildMovieUrl(tmdbId)
        : p.buildTvUrl(tmdbId, season, episode),
  }));

  const primary = sources[0];

  return {
    url: primary.url,
    provider: primary.provider,
    sources,
  };
}
