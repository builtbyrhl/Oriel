import type { StreamingProvider } from "../types";

export const vidsrcxyz: StreamingProvider = {
  name: "vidsrcxyz",
  label: "VidSrc.xyz",
  buildMovieUrl: (tmdbId) => `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
  buildTvUrl: (tmdbId, season, episode) =>
    `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
};
