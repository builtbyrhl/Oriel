import type { StreamingProvider } from "../types";

export const smashystream: StreamingProvider = {
  name: "smashystream",
  label: "SmashyStream",
  buildMovieUrl: (tmdbId) =>
    `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`,
  buildTvUrl: (tmdbId, season, episode) =>
    `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
};
