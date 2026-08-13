// Oriel Media Data Engine — core type definitions.
//
// Three representations are deliberately separated:
//   1. TMDB external representation (what the TMDB API returns)
//   2. Internal database representation (what maps 1:1 to public.oriel_movies)
//   3. Frontend representation (created on demand by consumers, not by the engine)

// ---------------------------------------------------------------------------
// 1. External TMDB representation
// ---------------------------------------------------------------------------

/** The two media kinds Oriel ingests from TMDB. */
export type MediaType = "movie" | "tv";

export interface TmdbGenre {
  id: number;
  name: string;
}

/** A movie as returned by TMDB list endpoints (discover, trending, popular, top_rated). */
export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
  video?: boolean;
}

/** A movie as returned by the TMDB `/movie/{id}` detail endpoint. */
export interface TmdbMovieDetail extends TmdbMovieSummary {
  runtime?: number | null;
  genres?: TmdbGenre[];
  status?: string;
  origin_country?: string[];
  production_countries?: Array<{ iso_3166_1?: string; name?: string }>;
}

/** A TV series as returned by TMDB list endpoints (discover, trending, popular, top_rated). */
export interface TmdbTvSummary {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
}

/** A TV series as returned by the TMDB `/tv/{id}` detail endpoint. */
export interface TmdbTvDetail extends TmdbTvSummary {
  genres?: TmdbGenre[];
  status?: string;
  in_production?: boolean;
  last_air_date?: string;
  number_of_episodes?: number;
  number_of_seasons?: number;
  episode_run_time?: number[];
  networks?: Array<{ id?: number; name?: string; origin_country?: string }>;
  production_countries?: Array<{ iso_3166_1?: string; name?: string }>;
}

export interface TmdbListResult<T = TmdbMovieSummary | TmdbTvSummary> {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: T[];
}

/** Sources the ingestion layer can discover candidate media from. */
export type DiscoverySource =
  | "trending"
  | "popular"
  | "top_rated"
  | "discover";

// ---------------------------------------------------------------------------
// 2. Internal database representation (public.oriel_movies)
// ---------------------------------------------------------------------------

export interface OrielMediaRecord {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null; // movie release_date / tv first_air_date (YYYY-MM-DD)
  vote_average: number | null;
  vote_count: number | null;
  popularity: number | null;
  genre_ids: number[];
  genres: string[];
  original_language: string | null;
  adult: boolean; // movie-specific, always false for tv
  video: boolean; // movie-specific, always false for tv
  runtime: number | null; // movie runtime / first tv episode runtime (minutes)
  origin_countries: string[];
  status: string | null;
  // TV-specific fields (null / false / empty for movies)
  number_of_episodes: number | null;
  number_of_seasons: number | null;
  last_air_date: string | null;
  in_production: boolean;
  networks: string[];
}

/** Backwards-compatible alias kept for callers that only deal with movies. */
export type OrielMovieRecord = OrielMediaRecord;

export interface OrielMediaRow extends OrielMediaRecord {
  id: number;
  created_at: string;
  updated_at: string;
  last_sync_at: string;
}

// ---------------------------------------------------------------------------
// Ingestion result / reporting types
// ---------------------------------------------------------------------------

export interface NormalizationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
  /** Stable record identity (tmdb_id) even when normalization failed. */
  tmdbId?: number;
}

/** Backwards-compatible alias. */
export type MovieNormalizationResult<T> = NormalizationResult<T>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Backwards-compatible alias. */
export type MovieValidationResult = ValidationResult;

export interface IngestionSummary {
  mediaType: MediaType;
  source: DiscoverySource;
  requested: number;
  discovered: number;
  fetched: number;
  inserted: number;
  updated: number;
  skippedInvalid: number;
  failedFetch: number;
  failedWrite: number;
  errors: string[];
}

export interface UpsertOutcome {
  inserted: number;
  updated: number;
  matched: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Dependency interfaces (testable ingestion engine)
// ---------------------------------------------------------------------------

/** Minimal TMDB gateway surface the engine relies on. */
export interface TmdbGateway {
  discoverCandidates(
    source: DiscoverySource,
    options?: {
      mediaType?: MediaType;
      page?: number;
      genreId?: number;
      minVoteCount?: number;
      year?: number;
    }
  ): Promise<TmdbListResult>;
  fetchDetail(
    tmdbId: number,
    mediaType: MediaType
  ): Promise<TmdbMovieDetail | TmdbTvDetail | null>;
}

/** Minimal Supabase media-table gateway surface. */
export interface MovieDbGateway {
  /** Returns TMDB ids that already exist in the table for the given media type. */
  existingTmdbIds(ids: number[], mediaType: MediaType): Promise<Set<number>>;
  /** Upserts on (media_type, tmdb_id) conflict. */
  upsertMovies(records: OrielMediaRecord[]): Promise<UpsertOutcome>;
}
