// AI provider tests (node:test, run with tsx loader).
//
// Providers are exercised with an injected `fetchImpl` returning canned HTTP
// payloads — no live AI calls. Parsing helpers are tested directly.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractGeminiText,
  extractOpenRouterText,
  GeminiProvider,
  OpenRouterProvider,
  parseJsonObject,
  toGeminiSchema,
} from "./providers";
import { SEMANTIC_FIELDS_JSON_SCHEMA } from "./schema";
import type { AiStructuredRequest } from "./types";

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
