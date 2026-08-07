import VidAPI from "./providers/vidapi";
import { StreamingProvider } from "./types";

const providers: StreamingProvider[] = [
  VidAPI,
];

export async function getMovieStream(
  tmdbId: number
) {
  for (const provider of providers) {
    try {
      const result =
        await provider.getMovieStream(tmdbId);

      if (result) {
        return result;
      }
    } catch {}
  }

  return null;
}

export async function getEpisodeStream(
  tmdbId: number,
  season: number,
  episode: number
) {
  for (const provider of providers) {
    try {
      const result =
        await provider.getEpisodeStream(
          tmdbId,
          season,
          episode
        );

      if (result) {
        return result;
      }
    } catch {}
  }

  return null;
}
