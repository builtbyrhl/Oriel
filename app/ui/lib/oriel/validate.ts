// Oriel Movie Data Engine — validation.
//
// Decides whether a normalized OrielMovieRecord is eligible for persistence.
// Normalization coerces types; validation enforces the minimum integrity bar.

import type { MovieValidationResult, OrielMovieRecord } from "./types";

/** Minimum acceptable length for a stored title. */
const MIN_TITLE_LENGTH = 1;
/** A vote average that is clearly malformed (outside TMDB's 0-10 scale). */
const MAX_VOTE_AVERAGE = 10;

/**
 * Validates a normalized movie record against the required-field contract.
 *
 * Rules:
 *   - tmdb_id must be a positive integer (primary external identity)
 *   - title must be a non-empty string
 *   - vote_average, when present, must remain within the TMDB 0-10 scale
 *   - optional fields that are null are tolerated (their absence is not a
 *     reason to reject the movie)
 *
 * Missing overview/posters etc. is intentionally NOT an error at this layer:
 * those records may still be useful to the curation engine, which applies its
 * own quality thresholds later.
 */
export function validateMovieRecord(
  movie: OrielMovieRecord
): MovieValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(movie.tmdb_id) || movie.tmdb_id <= 0) {
    errors.push(`Invalid tmdb_id: ${String(movie.tmdb_id)}`);
  }

  if (typeof movie.title !== "string" || movie.title.trim().length < MIN_TITLE_LENGTH) {
    errors.push(`Movie ${movie.tmdb_id} has no usable title`);
  }

  if (
    movie.vote_average !== null &&
    (movie.vote_average < 0 || movie.vote_average > MAX_VOTE_AVERAGE)
  ) {
    errors.push(
      `Movie ${movie.tmdb_id} has out-of-range vote_average (${movie.vote_average})`
    );
  }

  return { valid: errors.length === 0, errors };
}