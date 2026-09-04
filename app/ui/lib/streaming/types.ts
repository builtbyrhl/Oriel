// Streaming source types — shared by the overlay player and the inline player.
//
// Both players draw from the same ranked registry (`lib/streaming/providers`),
// so reliability ordering is applied consistently: the lowest `rank` (1) is the
// default/first source, and the dropdown follows in rank order. No component
// holds its own ad-hoc source list.

export type MediaType = "movie" | "tv";

export interface StreamingProvider {
  /** Stable machine id (also used as the DOM option key). */
  name: string;
  /** Short human label shown in the source picker. */
  label: string;
  /**
   * Reliability priority — lower = tried first. The default (rank 1) is the
   * source served first; if the user switches away it's honored, and the
   * selection is remembered per media item in localStorage.
   */
  rank: number;
  /** TMDB-id tokenised template, e.g. `https://…/movie/{{tmdbId}}`. */
  movieUrlTemplate?: string;
  /** TV template uses {{tmdbId}}, {{season}}, {{episode}}. */
  seriesUrlTemplate?: string;
  enabled?: boolean;
  description?: string;
}

export interface StreamSource {
  provider: string;
  label: string;
  url: string;
}

export interface StreamResult {
  url: string;
  provider: string;
  sources: StreamSource[];
}
