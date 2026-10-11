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
  /** "primary" = curated default row; "secondary" = extended "+N more" drawer. */
  tier?: "primary" | "secondary";
};


export type PlaybackRequest = {
  provider: PlaybackProvider;
  contentType: PlaybackContentType;
  tmdbId: number;
  season?: number;
  episode?: number;
};
