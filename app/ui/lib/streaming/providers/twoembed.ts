import type { StreamingProvider } from "../types";

export const twoembed: StreamingProvider = {
  name: "2embed",
  label: "2Embed.cc",
  buildMovieUrl: (tmdbId) => `https://www.2embed.cc/embed/${tmdbId}`,
  buildTvUrl: (tmdbId, season, episode) =>
    `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
};
