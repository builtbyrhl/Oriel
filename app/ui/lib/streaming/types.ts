export interface StreamResult {
  url: string;
  provider: string;
}

export interface StreamingProvider {
  name: string;

  getMovieStream(
    tmdbId: number
  ): Promise<StreamResult | null>;

  getEpisodeStream(
    tmdbId: number,
    season: number,
    episode: number
  ): Promise<StreamResult | null>;
}
