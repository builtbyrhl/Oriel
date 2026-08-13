// Oriel AI layer — prompt construction for semantic enrichment.
//
// The prompt is descriptive only. It instructs the model to characterize a
// movie/TV series (mood, tone, pacing, themes, semantic genres, intensity,
// audience) and explicitly forbids ranking, rating quality, recommending, or
// comparing titles. Enrichment must never become a selection mechanism.

import type { OrielMediaRecord } from "../oriel/types";
import { SEMANTIC_FIELDS_JSON_SCHEMA } from "./schema";
import type { AiStructuredRequest } from "./types";

const SYSTEM_PROMPT =
  "You are an expert film and television analyst. You produce precise, " +
  "neutral semantic descriptions of individual movies and TV series. " +
  "You only describe what a title IS, never judge whether it is good." +
  "You do not rate, score, rank, compare, recommend, or select titles. " +
  "You do not express personal taste. " +
  "Respond with valid JSON only, matching the provided schema exactly.";

export function buildEnrichmentRequest(
  media: OrielMediaRecord
): AiStructuredRequest {
  const year = media.release_date ? media.release_date.slice(0, 4) : null;
  const genres = media.genres.length > 0 ? media.genres.join(", ") : "n/a";

  const userPrompt = [
    `Describe the following ${media.media_type === "tv" ? "TV series" : "movie"} semantically.`,
    ``,
    `Title: ${media.title}`,
    year ? `Year: ${year}` : null,
    media.original_language
      ? `Original language: ${media.original_language.toUpperCase()}`
      : null,
    `TMDB genres: ${genres}`,
    media.overview ? `Synopsis: ${media.overview}` : null,
    media.runtime
      ? `Runtime: ${media.runtime} minutes`
      : null,
    ``,
    `Produce exactly these fields:`,
    `- moods: short adjective/noun phrases capturing the emotional atmosphere`,
    `- tone: one compact phrase for the overall tone`,
    `- pacing: "slow", "moderate", or "fast"`,
    `- themes: core subject matters explored by the title`,
    `- semantic_genres: descriptive sub-genres (e.g. "slow-burn thriller", "heist", "coming-of-age")`,
    `- intensity: an integer 0-10 describing how intense the experience is (not a quality score)`,
    `- audience_descriptors: who this is well suited for (e.g. "mature audiences", "fans of psychological drama")`,
    ``,
    `Constraints:`,
    `- Be concise; 1-8 items per list, each a short phrase.`,
    `- Do not rate, score, rank, compare, recommend, or select titles.`,
    `- Do not include any text outside the JSON object.`,
    `- Output must conform to this JSON schema: ${JSON.stringify(SEMANTIC_FIELDS_JSON_SCHEMA)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    jsonSchema: SEMANTIC_FIELDS_JSON_SCHEMA,
    temperature: 0.2,
  };
}
