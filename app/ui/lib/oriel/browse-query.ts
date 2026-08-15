// Browse page state isolation — Spin vs Rhythm.
//
// The Browse page has two independent content systems that historically
// shared one query object:
//
//   * SpinToExplore — the exploration mechanism. It owns its exploration
//     intent (genre + mood) locally; nothing on the page reads it but Spin.
//   * Rhythm — an editorial stage with its own content. It must keep
//     rendering the same editorial baseline no matter what Spin selects.
//
// This module is the single source of truth for those two query shapes so the
// isolation is provable: Spin's intent can change freely without ever
// touching the query Rhythm fetches with, and vice-versa.
//
// Pure functions and constants only — no state, no fetch, no React. The
// discovery API requires at least one of genre or mood, so Rhythm's editorial
// baseline is a fixed editorial mood rather than a genre (it must not read as
// "Spin's genre").

import type { DiscoveryQuery } from "./discovery-client";
import type { SpinQuery } from "./spin-client";

/** Spin's curated landing intent — valid candidates on the first paint. */
export const DEFAULT_SPIN_INTENT: DiscoveryQuery = { genre: "Drama" };

/** How many curated titles Rhythm should stage (unchanged from before). */
export const RHYTHM_LIMIT = 40;

/** How many candidates a Spin request should return (unchanged). */
export const SPIN_LIMIT = 20;

/** Rhythm's fixed editorial mood — independent of Spin's genre/mood. */
export const RHYTHM_EDITORIAL_MOOD = "thoughtful";

/**
 * The query Rhythm always fetches with. Deliberately carries no genre and no
 * Spin-derived mood: it is a constant editorial baseline for the page's media
 * scope, so Spin changes can never move Rhythm's content.
 */
export function buildRhythmQuery(mediaType: "movie" | "tv"): DiscoveryQuery {
  return { mood: RHYTHM_EDITORIAL_MOOD, mediaType, limit: RHYTHM_LIMIT };
}

/**
 * The query Spin fetches with. Carries exactly the user's exploration intent
 * (genre + mood) plus the page's media scope. Changing this never affects
 * `buildRhythmQuery`, by construction.
 */
export function buildSpinQuery(
  intent: DiscoveryQuery,
  mediaType: "movie" | "tv"
): SpinQuery {
  return {
    genre: intent.genre,
    mood: intent.mood,
    mediaType,
    limit: SPIN_LIMIT,
  };
}
