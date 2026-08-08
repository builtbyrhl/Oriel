import { StreamingProvider } from "../types";

export const vidsrc: StreamingProvider = {
  name: "vidsrc",
  label: "VidSrc",

  buildMovieUrl(tmdbId: number) {
    return "";
  },

  buildTvUrl(tmdbId: number, season: number, episode: number) {
    return "";
  }
};
