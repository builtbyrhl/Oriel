import {
  StreamResult,
  StreamingProvider,
} from "../types";

const BASE = "https://vidapi.example/embed";

const VidAPI: StreamingProvider = {
  name: "VidAPI",

  async getMovieStream(tmdbId) {
    return {
      provider: "VidAPI",
      url: `${BASE}/movie/${tmdbId}`,
    };
  },

  async getEpisodeStream(
    tmdbId,
    season,
    episode
  ) {
    return {
      provider: "VidAPI",
      url: `${BASE}/tv/${tmdbId}/${season}/${episode}`,
    };
  },
};

export default VidAPI;
