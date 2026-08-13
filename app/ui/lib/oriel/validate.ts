// Oriel Media Data Engine — validation.
//
// Decides whether a normalized OrielMediaRecord is eligible for persistence.
// Normalization coerces types; validation enforces the minimum integrity bar.
// Movies and TV series share the same contract.

import type { OrielMediaRecord, ValidationResult } from "./types";

/** Minimum acceptable length for a stored title. */
const MIN_TITLE_LENGTH = 1;
/** A vote average that is clearly malformed (outside TMDB's 0-10 scale). */
const MAX_VOTE_AVERAGE = 10;

/**
 * Validates a normalized media record against the required-field contract.
 *
 * Rules:
 *   - tmdb_id must be a positive integer (primary external identity)
 *   - title must be a non-empty string
 *   - vote_average, when present, must remain within the TMDB 0-10 scale
 *   - optional fields that are null are tolerated (their absence is not a
 *     reason to reject the record)
 *
 * Missing overview/posters etc. is intentionally NOT an error at this layer:
 * those records may still be useful to the curation engine, which applies its
 * own quality thresholds later.
 */
export function validateMediaRecord(
  record: OrielMediaRecord
): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(record.tmdb_id) || record.tmdb_id <= 0) {
    errors.push(`Invalid tmdb_id: ${String(record.tmdb_id)}`);
  }

  if (
    typeof record.title !== "string" ||
    record.title.trim().length < MIN_TITLE_LENGTH
  ) {
    errors.push(`Record ${record.tmdb_id} has no usable title`);
  }

  if (
    record.vote_average !== null &&
    (record.vote_average < 0 || record.vote_average > MAX_VOTE_AVERAGE)
  ) {
    errors.push(
      `Record ${record.tmdb_id} has out-of-range vote_average (${record.vote_average})`
    );
  }

  return { valid: errors.length === 0, errors };
}

/** Backwards-compatible alias. */
export function validateMovieRecord(
  record: OrielMediaRecord
): ValidationResult {
  return validateMediaRecord(record);
}
