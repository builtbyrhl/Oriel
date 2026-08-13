// Oriel AI layer — strict validation of AI structured output.
//
// The AI layer's output is validated with a tight zod schema before it can be
// persisted. Anything that does not match exactly (extra keys, wrong types,
// out-of-range values, empty/oversized arrays) fails validation and the job
// is recorded as failed — arbitrary AI text never reaches the database.
//
// The JSON schema constant is the machine-readable hint sent to providers
// (Gemini responseSchema / OpenRouter json_object); zod is the authoritative
// validator. Keep the two in sync when extending the field set.

import { z } from "zod";
import type { SemanticFields } from "./types";

const MAX_LIST_ITEMS = 12;
const MAX_STRING_LEN = 80;

/**
 * Validates an array of non-empty, trimmed strings within size bounds,
 * de-duplicating values before checking the final shape.
 */
function cappedStringArray(maxItems: number, maxLen: number, label: string) {
  return z
    .array(z.string())
    .min(1, `${label} must contain at least one item`)
    .max(maxItems, `${label} must contain at most ${maxItems} items`)
    .transform((items) =>
      Array.from(
        new Set(
          items
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        )
      ).slice(0, maxItems)
    )
    .pipe(
      z
        .array(z.string().trim().min(1).max(maxLen))
        .min(1, `${label} must contain at least one non-empty item`)
        .max(maxItems)
    );
}

/**
 * Strict schema for the semantic enrichment envelope. `.strict()` rejects
 * unknown keys so future fields require an explicit version bump.
 */
export const semanticFieldsSchema = z
  .object({
    moods: cappedStringArray(MAX_LIST_ITEMS, MAX_STRING_LEN, "moods"),
    tone: z.string().trim().min(1).max(MAX_STRING_LEN),
    pacing: z.enum(["slow", "moderate", "fast"]),
    themes: cappedStringArray(MAX_LIST_ITEMS, MAX_STRING_LEN, "themes"),
    semantic_genres: cappedStringArray(
      MAX_LIST_ITEMS,
      MAX_STRING_LEN,
      "semantic_genres"
    ),
    intensity: z
      .number()
      .int("intensity must be a whole number")
      .min(0, "intensity must be between 0 and 10")
      .max(10, "intensity must be between 0 and 10"),
    audience_descriptors: cappedStringArray(
      MAX_LIST_ITEMS,
      MAX_STRING_LEN,
      "audience_descriptors"
    ),
  })
  .strict();

export type SemanticFieldsParsed = z.infer<typeof semanticFieldsSchema>;

/** Validates arbitrary provider output; returns typed fields on success. */
export function parseSemanticFields(raw: unknown):
  | { ok: true; fields: SemanticFields }
  | { ok: false; errors: string[] } {
  const result = semanticFieldsSchema.safeParse(raw);

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  return { ok: true, fields: result.data as SemanticFields };
}

/**
 * Machine-readable JSON schema sent to providers so the model emits JSON that
 * already fits the envelope (saved back as the `fields` JSONB value).
 */
export const SEMANTIC_FIELDS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    moods: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
    },
    tone: { type: "string" },
    pacing: { type: "string", enum: ["slow", "moderate", "fast"] },
    themes: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
    },
    semantic_genres: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
    },
    intensity: { type: "integer", minimum: 0, maximum: 10 },
    audience_descriptors: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 12,
    },
  },
  required: [
    "moods",
    "tone",
    "pacing",
    "themes",
    "semantic_genres",
    "intensity",
    "audience_descriptors",
  ],
  additionalProperties: false,
};
