import type { StreamingProvider } from "../types";

export const vidsrccc: StreamingProvider = {
  name: "vidsrccc",
  label: "VidSrc.cc",
  buildMovieUrl: (tmdbId) => `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
  buildTvUrl: (tmdbId, season, episode) =>
    `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
};
