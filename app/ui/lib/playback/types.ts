export type PlaybackContentType = "movie" | "series";

export type PlaybackProvider = {
  id: string;
  name: string;
  enabled: boolean;


  // Use an authorized HTTPS embed URL.
  // Supported tokens:
  // {{tmdbId}}, {{season}}, {{episode}}
  movieUrlTemplate?: string;
  seriesUrlTemplate?: string;


  description?: string;
};


export type PlaybackRequest = {
  provider: PlaybackProvider;
  contentType: PlaybackContentType;
  tmdbId: number;
  season?: number;
  episode?: number;
};
