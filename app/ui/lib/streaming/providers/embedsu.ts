import { StreamingProvider } from "../types";

export const embedsu: StreamingProvider = {
  name: "embedsu",
  label: "EmbedSu",

  buildMovieUrl(tmdbId: number) {
    return "";
  },

  buildTvUrl(tmdbId: number, season: number, episode: number) {
    return "";
  }
};
