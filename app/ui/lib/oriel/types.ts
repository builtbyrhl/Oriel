// Oriel Movie Data Engine — core type definitions.
//
// Three representations are deliberately separated:
//   1. TMDB external representation (what the TMDB API returns)
//   2. Internal database representation (what maps 1:1 to public.oriel_movies)
//   3. Frontend representation (created on demand by consumers, not by the engine)

// ---------------------------------------------------------------------------
// 1. External TMDB representation
// ---------------------------------------------------------------------------

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

export interface TmdbListResult<T = TmdbMovieSummary> {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: T[];
}

/** Sources the ingestion layer can discover candidate movies from. */
export type DiscoverySource =
  | "trending"
  | "popular"
  | "top_rated"
  | "discover";

// ---------------------------------------------------------------------------
// 2. Internal database representation (public.oriel_movies)
// ---------------------------------------------------------------------------

export interface OrielMovieRecord {
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null; // ISO date (YYYY-MM-DD)
  vote_average: number | null;
  vote_count: number | null;
  popularity: number | null;
  genre_ids: number[];
  genres: string[];
  original_language: string | null;
  adult: boolean;
  video: boolean;
  runtime: number | null;
  origin_countries: string[];
  status: string | null;
}

export interface OrielMovieRow extends OrielMovieRecord {
  id: number;
  created_at: string;
  updated_at: string;
  last_sync_at: string;
}

// ---------------------------------------------------------------------------
// Ingestion result / reporting types
// ---------------------------------------------------------------------------

export interface MovieNormalizationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
  /** Stable record identity (tmdb_id) even when normalization failed. */
  tmdbId?: number;
}

export interface MovieValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IngestionSummary {
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
      page?: number;
      genreId?: number;
      minVoteCount?: number;
      year?: number;
    }
  ): Promise<TmdbListResult<TmdbMovieSummary>>;
  fetchMovieDetail(tmdbId: number): Promise<TmdbMovieDetail | null>;
}

/** Minimal Supabase movies-table gateway surface. */
export interface MovieDbGateway {
  /** Returns TMDB ids that already exist in the table. */
  existingTmdbIds(ids: number[]): Promise<Set<number>>;
  /** Upserts on tmdb_id conflict. */
  upsertMovies(records: OrielMovieRecord[]): Promise<UpsertOutcome>;
}