// Oriel AI layer — concrete AI providers.
//
// Two interchangeable providers backed by raw HTTP (reusing Node/edge `fetch`,
// no SDK dependency): Google Gemini (structured output via responseSchema) and
// OpenRouter (OpenAI-compatible chat completions). The engine never imports
// these directly — swap providers through `createAiProvider()`.
//
// Each provider accepts an injected `fetchImpl` so parsing is unit-testable
// without live network calls.

import type { AiProvider, AiStructuredRequest } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

// ---------------------------------------------------------------------------
// Key rotation helpers
// ---------------------------------------------------------------------------

/**
 * Collects every Gemini API key configured for this environment. Supports a
 * single `GEMINI_API_KEY`, numbered keys (`GEMINI_API_KEY_2` .. `_9`), and a
 * comma/space-separated `GEMINI_API_KEYS` list. Duplicates are removed and
 * values are never logged or otherwise exposed.
 */
export function parseGeminiApiKeys(
  env: Record<string, string | undefined> = process.env
): string[] {
  const keys: string[] = [];

  const push = (value: string | undefined) => {
    if (!value) return;

    for (const part of value.split(/[\s,]+/)) {
      const trimmed = part.trim();
      if (trimmed) keys.push(trimmed);
    }
  };

  push(env.GEMINI_API_KEY);

  for (let i = 2; i <= 9; i += 1) {
    push(env[`GEMINI_API_KEY_${i}`]);
  }

  push(env.GEMINI_API_KEYS);

  return Array.from(new Set(keys));
}


// ---------------------------------------------------------------------------
// JSON parsing helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Extracts the JSON payload from a Gemini generateContent response. */
export function extractGeminiText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const candidates = (data as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const content = candidates[0] as { content?: { parts?: unknown } };

  const parts = content?.content?.parts;

  if (!Array.isArray(parts) || parts.length === 0) return null;

  const text = (parts[0] as { text?: unknown })?.text;

  return typeof text === "string" ? text : null;
}

/** Extracts the JSON payload from an OpenRouter chat completion response. */
export function extractOpenRouterText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const choices = (data as { choices?: unknown }).choices;

  if (!Array.isArray(choices) || choices.length === 0) return null;

  const message = (choices[0] as { message?: { content?: unknown } })?.message;

  return typeof message?.content === "string" ? message.content : null;
}

/** Parses a JSON string into a value, tolerating surrounding markdown. */
export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  // Some models wrap JSON in ```json fences.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  // Fall back to the first balanced {...} block.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("Model response did not contain JSON");
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Gemini's structured-output schema accepts a JSON-schema subset that rejects
 * keywords such as `additionalProperties`. The canonical schema (kept strict
 * for other consumers) is sanitized here so the vendor never sees them.
 */
export function toGeminiSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") continue;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = toGeminiSchema(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }

  return out;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = options.model ?? process.env.ORIEL_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (!this.apiKey) {
      throw new Error("GeminiProvider requires a GEMINI_API_KEY");
    }
  }

  async generateStructured(request: AiStructuredRequest): Promise<unknown> {
    const res = await this.fetchImpl(
      `${GEMINI_BASE}/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(request.jsonSchema),
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        `Gemini request failed: ${res.status} ${(await res.text()).slice(0, 500)}`
      );
    }

    const data: unknown = await res.json();
    const text = extractGeminiText(data);

    if (!text) {
      throw new Error("Gemini returned no text content");
    }

    return parseJsonObject(text);
  }
}

// ---------------------------------------------------------------------------
// Gemini — rotating multi-key provider
// ---------------------------------------------------------------------------

export interface RotatingGeminiProviderOptions {
  /** Keys to rotate across. Defaults to all keys found in the environment. */
  apiKeys?: string[];
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Gemini provider backed by several API keys. Requests are spread across the
 * keys round-robin (so quota is shared rather than exhausted on one key), and
 * if a key fails the next key is tried for the same request. Only when every
 * configured key has failed does the error surface — letting the enrichment
 * job's existing backoff/retry handle it.
 */
export class RotatingGeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly providers: GeminiProvider[];
  private index = 0;

  constructor(options: RotatingGeminiProviderOptions = {}) {
    const apiKeys = options.apiKeys ?? parseGeminiApiKeys(process.env);

    if (apiKeys.length === 0) {
      throw new Error(
        "RotatingGeminiProvider requires at least one Gemini API key"
      );
    }

    this.model = options.model ?? process.env.ORIEL_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    this.providers = apiKeys.map(
      (apiKey) =>
        new GeminiProvider({
          apiKey,
          model: this.model,
          fetchImpl: options.fetchImpl,
        })
    );
  }

  async generateStructured(request: AiStructuredRequest): Promise<unknown> {
    const failures: string[] = [];

    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[this.index % this.providers.length];
      this.index += 1;

      try {
        return await provider.generateStructured(request);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
      }
    }

    throw new Error(`All Gemini keys failed (${failures.join(" | ")})`);
  }
}

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------

export interface OpenRouterProviderOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    this.model = options.model ?? process.env.ORIEL_OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (!this.apiKey) {
      throw new Error("OpenRouterProvider requires an OPENROUTER_API_KEY");
    }
  }

  async generateStructured(request: AiStructuredRequest): Promise<unknown> {
    const res = await this.fetchImpl(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: request.temperature ?? 0.2,
        // json_object mode: prompt explicitly requires JSON (it does).
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(
        `OpenRouter request failed: ${res.status} ${(await res.text()).slice(0, 500)}`
      );
    }

    const data: unknown = await res.json();
    const text = extractOpenRouterText(data);

    if (!text) {
      throw new Error("OpenRouter returned no message content");
    }

    return parseJsonObject(text);
  }
}

// ---------------------------------------------------------------------------
// Failover (e.g. Gemini primary with OpenRouter fallback)
// ---------------------------------------------------------------------------

/**
 * Tries providers in order until one succeeds. Used to fall back from Gemini
 * to OpenRouter when auto-detection is enabled and both are configured.
 */
export class FailoverProvider implements AiProvider {
  readonly name: string;
  readonly model: string;
  private readonly providers: AiProvider[];

  constructor(providers: AiProvider[]) {
    if (providers.length === 0) {
      throw new Error("FailoverProvider requires at least one provider");
    }

    this.providers = providers;
    this.name = providers.map((provider) => provider.name).join("->");
    this.model = providers[0].model;
  }

  async generateStructured(request: AiStructuredRequest): Promise<unknown> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.generateStructured(request);
      } catch (err) {
        failures.push(
          `${provider.name}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    throw new Error(`All AI providers failed (${failures.join(" | ")})`);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type AiProviderName = "gemini" | "openrouter";

function resolveProviderName(env: NodeJS.ProcessEnv): AiProviderName | null {
  const requested = (env.ORIEL_AI_PROVIDER ?? "").trim().toLowerCase();

  if (requested) {
    if (requested === "gemini") return "gemini";
    if (requested === "openrouter") return "openrouter";
    throw new Error(
      `Unknown ORIEL_AI_PROVIDER "${requested}". Use "gemini" or "openrouter".`
    );
  }

  if (parseGeminiApiKeys(env).length > 0) return "gemini";
  if (env.OPENROUTER_API_KEY) return "openrouter";

  return null;
}

/** Builds a single Gemini provider, rotating when more than one key exists. */
function buildGeminiProvider(
  env: NodeJS.ProcessEnv,
  fetchImpl?: typeof fetch
): AiProvider {
  const apiKeys = parseGeminiApiKeys(env);
  const model = env.ORIEL_GEMINI_MODEL;

  if (apiKeys.length > 1) {
    return new RotatingGeminiProvider({ apiKeys, model, fetchImpl });
  }

  return new GeminiProvider({ apiKey: apiKeys[0], model, fetchImpl });
}

/**
 * Builds an AI provider from the environment.
 *
 * * `ORIEL_AI_PROVIDER=gemini` → Gemini (rotating when multiple keys exist).
 * * `ORIEL_AI_PROVIDER=openrouter` → OpenRouter.
 * * unset → auto-detect: Gemini primary with OpenRouter fallback when both
 *   are configured, otherwise whichever single provider is available.
 */
export function createAiProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch
): AiProvider {
  const requested = (env.ORIEL_AI_PROVIDER ?? "").trim().toLowerCase();

  if (requested === "gemini") {
    return buildGeminiProvider(env, fetchImpl);
  }

  if (requested === "openrouter") {
    return new OpenRouterProvider({ apiKey: env.OPENROUTER_API_KEY, fetchImpl });
  }

  if (requested) {
    throw new Error(
      `Unknown ORIEL_AI_PROVIDER "${requested}". Use "gemini" or "openrouter".`
    );
  }

  // Auto-detect: Gemini primary, OpenRouter as fallback when both exist.
  const geminiKeys = parseGeminiApiKeys(env);
  const primary = geminiKeys.length > 0 ? buildGeminiProvider(env, fetchImpl) : null;
  const fallback = env.OPENROUTER_API_KEY
    ? new OpenRouterProvider({ apiKey: env.OPENROUTER_API_KEY, fetchImpl })
    : null;

  if (primary && fallback) {
    return new FailoverProvider([primary, fallback]);
  }

  if (primary) return primary;
  if (fallback) return fallback;

  throw new Error(
    "No AI provider configured. Set ORIEL_AI_PROVIDER (gemini|openrouter) " +
      "and the matching GEMINI_API_KEY or OPENROUTER_API_KEY."
  );
}

/** Whether an AI provider can be constructed from the environment. */
export function isAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const name = resolveProviderName(env);

  if (name === "gemini") return parseGeminiApiKeys(env).length > 0;
  if (name === "openrouter") return Boolean(env.OPENROUTER_API_KEY);

  return parseGeminiApiKeys(env).length > 0 || Boolean(env.OPENROUTER_API_KEY);
}
