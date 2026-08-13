// AI provider tests (node:test, run with tsx loader).
//
// Providers are exercised with an injected `fetchImpl` returning canned HTTP
// payloads — no live AI calls. Parsing helpers are tested directly.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  FailoverProvider,
  RotatingGeminiProvider,
  createAiProvider,
  extractGeminiText,
  extractOpenRouterText,
  GeminiProvider,
  isAiConfigured,
  OpenRouterProvider,
  parseGeminiApiKeys,
  parseJsonObject,
  toGeminiSchema,
} from "./providers";
import { SEMANTIC_FIELDS_JSON_SCHEMA } from "./schema";
import type { AiProvider, AiStructuredRequest } from "./types";

const request: AiStructuredRequest = {
  systemPrompt: "Describe only, never rate.",
  userPrompt: "Describe Inception. JSON.",
  jsonSchema: SEMANTIC_FIELDS_JSON_SCHEMA,
};

function jsonResponse(ok: boolean, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toGeminiSchema", () => {
  it("strips additionalProperties recursively but keeps the rest", () => {
    const input: Record<string, unknown> = {
      type: "object",
      additionalProperties: false,
      properties: {
        tone: { type: "string", additionalProperties: false },
        nested: { type: "object", additionalProperties: false },
      },
      required: ["tone"],
    };

    const output = toGeminiSchema(input);
    const props = output.properties as Record<string, Record<string, unknown>>;

    assert.equal("additionalProperties" in output, false);
    assert.equal("additionalProperties" in props.tone, false);
    assert.equal("additionalProperties" in props.nested, false);
    assert.equal(output.type, "object");
    assert.deepEqual(output.required, ["tone"]);
  });
});

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

describe("parse helpers", () => {
  it("extracts text from a Gemini candidate payload", () => {
    const data = {
      candidates: [{ content: { parts: [{ text: '{"pacing":"fast"}' }] } }],
    };
    assert.equal(extractGeminiText(data), '{"pacing":"fast"}');
  });

  it("returns null when Gemini has no candidates", () => {
    assert.equal(extractGeminiText({ candidates: [] }), null);
    assert.equal(extractGeminiText({}), null);
    assert.equal(extractGeminiText(null), null);
  });

  it("extracts content from an OpenRouter completion payload", () => {
    const data = {
      choices: [{ message: { content: '{"pacing":"slow"}' } }],
    };
    assert.equal(extractOpenRouterText(data), '{"pacing":"slow"}');
  });

  it("returns null when OpenRouter has no choices", () => {
    assert.equal(extractOpenRouterText({ choices: [] }), null);
    assert.equal(extractOpenRouterText(null), null);
  });

  it("parses plain, fenced, and wrapped JSON text", () => {
    assert.deepEqual(parseJsonObject('{"a":1}'), { a: 1 });
    assert.deepEqual(parseJsonObject('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(parseJsonObject('Here is the result:\n{"a":1}\nThanks!'), { a: 1 });
  });

  it("throws when no JSON is present", () => {
    assert.throws(() => parseJsonObject("no json here"), /did not contain JSON/);
  });
});

// ---------------------------------------------------------------------------
// GeminiProvider
// ---------------------------------------------------------------------------

describe("GeminiProvider", () => {
  it("posts a structured-output request and returns the parsed JSON", async () => {
    const captured: { url: string; headers: Headers; body: unknown } = {
      url: "",
      headers: new Headers(),
      body: null,
    };

    const fetchImpl: typeof fetch = async (input, init) => {
      captured.url = String(input);
      captured.headers = new Headers(init?.headers);
      captured.body = JSON.parse(String(init?.body));
      return jsonResponse(true, {
        candidates: [{ content: { parts: [{ text: '{"tone":"dark"}' }] } }],
      });
    };

    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-x", fetchImpl });
    const output = await provider.generateStructured(request);

    const body = captured.body as {
      generationConfig: { responseMimeType: string; responseSchema: unknown };
    };

    assert.deepEqual(output, { tone: "dark" });
    assert.match(captured.url, /generativelanguage.googleapis.com\/v1beta\/models\/gemini-x:generateContent/);
    assert.equal(captured.headers.get("x-goog-api-key"), "test-key");
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(body.generationConfig.responseSchema, toGeminiSchema(SEMANTIC_FIELDS_JSON_SCHEMA));
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(false, { error: "boom" });
    const provider = new GeminiProvider({ apiKey: "test-key", fetchImpl });

    await assert.rejects(() => provider.generateStructured(request), /Gemini request failed: 500/);
  });

  it("throws on empty content", async () => {
    const fetchImpl: typeof fetch = async () =>
      jsonResponse(true, { candidates: [{ content: { parts: [] } }] });
    const provider = new GeminiProvider({ apiKey: "test-key", fetchImpl });

    await assert.rejects(() => provider.generateStructured(request), /no text content/);
  });
});

// ---------------------------------------------------------------------------
// OpenRouterProvider
// ---------------------------------------------------------------------------

describe("OpenRouterProvider", () => {
  it("posts an OpenAI-compatible request and returns the parsed JSON", async () => {
    const captured: { url: string; headers: Headers; body: unknown } = {
      url: "",
      headers: new Headers(),
      body: null,
    };

    const fetchImpl: typeof fetch = async (input, init) => {
      captured.url = String(input);
      captured.headers = new Headers(init?.headers);
      captured.body = JSON.parse(String(init?.body));
      return jsonResponse(true, {
        choices: [{ message: { content: '{"intensity":6}' } }],
      });
    };

    const provider = new OpenRouterProvider({ apiKey: "sk-test", model: "openai/gpt-x", fetchImpl });
    const output = await provider.generateStructured(request);

    const body = captured.body as { model: string; response_format: { type: string } };

    assert.deepEqual(output, { intensity: 6 });
    assert.match(captured.url, /openrouter\.ai\/api\/v1\/chat\/completions/);
    assert.equal(captured.headers.get("authorization"), "Bearer sk-test");
    assert.equal(body.model, "openai/gpt-x");
    assert.deepEqual(body.response_format, { type: "json_object" });
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(false, { error: "rate limited" });
    const provider = new OpenRouterProvider({ apiKey: "sk-test", fetchImpl });

    await assert.rejects(() => provider.generateStructured(request), /OpenRouter request failed: 500/);
  });
});

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

describe("parseGeminiApiKeys", () => {
  it("collects the base key, numbered keys, and lists", () => {
    const keys = parseGeminiApiKeys({
      GEMINI_API_KEY: "key-1",
      GEMINI_API_KEY_2: "key-2",
      GEMINI_API_KEY_3: "key-3",
      GEMINI_API_KEYS: "key-4, key-5",
    } as Record<string, string>);

    assert.deepEqual(keys, ["key-1", "key-2", "key-3", "key-4", "key-5"]);
  });

  it("deduplicates and trims keys", () => {
    const keys = parseGeminiApiKeys({
      GEMINI_API_KEY: " key-a ",
      GEMINI_API_KEY_2: "key-a",
      GEMINI_API_KEYS: "key-b,key-b,key-c",
    } as Record<string, string>);

    assert.deepEqual(keys, ["key-a", "key-b", "key-c"]);
  });

  it("works with only numbered keys configured", () => {
    const keys = parseGeminiApiKeys({
      GEMINI_API_KEY_2: "key-2",
    } as Record<string, string>);

    assert.deepEqual(keys, ["key-2"]);
  });

  it("returns an empty list when nothing is configured", () => {
    assert.deepEqual(parseGeminiApiKeys({} as Record<string, string>), []);
  });
});

// ---------------------------------------------------------------------------
// RotatingGeminiProvider
// ---------------------------------------------------------------------------

describe("RotatingGeminiProvider", () => {
  function rotatingWithKeys(keys: string[]) {
    const usedKeys: string[] = [];

    const fetchImpl: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      usedKeys.push(headers.get("x-goog-api-key") ?? "");
      return jsonResponse(true, {
        candidates: [{ content: { parts: [{ text: '{"tone":"dark"}' }] } }],
      });
    };

    const provider = new RotatingGeminiProvider({ apiKeys: keys, fetchImpl });

    return { provider, usedKeys };
  }

  it("round-robins across the configured keys", async () => {
    const { provider, usedKeys } = rotatingWithKeys(["key-a", "key-b"]);

    await provider.generateStructured(request);
    await provider.generateStructured(request);
    await provider.generateStructured(request);

    assert.deepEqual(usedKeys, ["key-a", "key-b", "key-a"]);
  });

  it("fails over to the next key when one key fails", async () => {
    const usedKeys: string[] = [];

    const fetchImpl: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      const key = headers.get("x-goog-api-key") ?? "";
      usedKeys.push(key);

      if (key === "key-a") {
        return jsonResponse(false, { error: "rate limited" });
      }

      return jsonResponse(true, {
        candidates: [{ content: { parts: [{ text: '{"tone":"calm"}' }] } }],
      });
    };

    const provider = new RotatingGeminiProvider({
      apiKeys: ["key-a", "key-b"],
      fetchImpl,
    });

    const output = await provider.generateStructured(request);

    assert.deepEqual(output, { tone: "calm" });
    assert.deepEqual(usedKeys, ["key-a", "key-b"]);
  });

  it("throws only when every key has failed", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse(false, { error: "boom" });
    const provider = new RotatingGeminiProvider({
      apiKeys: ["key-a", "key-b"],
      fetchImpl,
    });

    await assert.rejects(() => provider.generateStructured(request), /All Gemini keys failed/);
  });

  it("requires at least one key", () => {
    assert.throws(
      () => new RotatingGeminiProvider({ apiKeys: [] }),
      /requires at least one Gemini API key/
    );
  });
});

// ---------------------------------------------------------------------------
// FailoverProvider
// ---------------------------------------------------------------------------

describe("FailoverProvider", () => {
  it("falls back to the second provider when the first fails", async () => {
    const failing: AiProvider = {
      name: "failing",
      model: "x",
      async generateStructured() {
        throw new Error("nope");
      },
    };

    const fallback: AiProvider = {
      name: "fallback",
      model: "y",
      async generateStructured() {
        return { ok: true };
      },
    };

    const provider = new FailoverProvider([failing, fallback]);
    assert.equal(provider.name, "failing->fallback");
    assert.deepEqual(await provider.generateStructured(request), { ok: true });
  });

  it("throws when every provider fails", async () => {
    const failing: AiProvider = {
      name: "failing",
      model: "x",
      async generateStructured() {
        throw new Error("nope");
      },
    };

    const provider = new FailoverProvider([failing]);
    await assert.rejects(() => provider.generateStructured(request), /All AI providers failed/);
  });
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

describe("createAiProvider", () => {
  const okFetch: typeof fetch = async (input) => {
    const url = String(input);

    if (url.includes("generativelanguage")) {
      return jsonResponse(true, {
        candidates: [{ content: { parts: [{ text: '{"tone":"dark"}' }] } }],
      });
    }

    return jsonResponse(true, {
      choices: [{ message: { content: '{"tone":"bright"}' } }],
    });
  };

  it("builds a rotating provider when multiple Gemini keys exist (auto)", () => {
    const provider = createAiProvider(
      {
        GEMINI_API_KEY: "key-1",
        GEMINI_API_KEY_2: "key-2",
      } as unknown as NodeJS.ProcessEnv,
      okFetch
    );

    assert.ok(provider instanceof RotatingGeminiProvider);
  });

  it("builds a failover provider when Gemini and OpenRouter both exist (auto)", () => {
    const provider = createAiProvider(
      {
        GEMINI_API_KEY: "key-1",
        OPENROUTER_API_KEY: "sk-test",
      } as unknown as NodeJS.ProcessEnv,
      okFetch
    );

    assert.ok(provider instanceof FailoverProvider);
    assert.equal(provider.name, "gemini->openrouter");
  });

  it("uses Gemini only when explicitly requested, even with OpenRouter present", () => {
    const provider = createAiProvider(
      {
        ORIEL_AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "key-1",
        OPENROUTER_API_KEY: "sk-test",
      } as unknown as NodeJS.ProcessEnv,
      okFetch
    );

    assert.ok(provider instanceof GeminiProvider);
  });

  it("uses OpenRouter when explicitly requested", () => {
    const provider = createAiProvider(
      {
        ORIEL_AI_PROVIDER: "openrouter",
        GEMINI_API_KEY: "key-1",
        OPENROUTER_API_KEY: "sk-test",
      } as unknown as NodeJS.ProcessEnv,
      okFetch
    );

    assert.ok(provider instanceof OpenRouterProvider);
  });

  it("falls back to OpenRouter when only it is configured", () => {
    const provider = createAiProvider(
      { OPENROUTER_API_KEY: "sk-test" } as unknown as NodeJS.ProcessEnv,
      okFetch
    );

    assert.ok(provider instanceof OpenRouterProvider);
  });

  it("throws when nothing is configured", () => {
    assert.throws(
      () => createAiProvider({} as unknown as NodeJS.ProcessEnv, okFetch),
      /No AI provider configured/
    );
  });
});

describe("isAiConfigured", () => {
  it("is true with a single Gemini key", () => {
    assert.equal(isAiConfigured({ GEMINI_API_KEY: "k" } as unknown as NodeJS.ProcessEnv), true);
  });

  it("is true with only a numbered Gemini key", () => {
    assert.equal(isAiConfigured({ GEMINI_API_KEY_2: "k" } as unknown as NodeJS.ProcessEnv), true);
  });

  it("is true with only an OpenRouter key", () => {
    assert.equal(isAiConfigured({ OPENROUTER_API_KEY: "k" } as unknown as NodeJS.ProcessEnv), true);
  });

  it("is false when nothing is configured", () => {
    assert.equal(isAiConfigured({} as unknown as NodeJS.ProcessEnv), false);
  });
});
