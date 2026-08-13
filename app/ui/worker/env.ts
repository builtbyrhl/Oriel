// Standalone environment loader for worker processes.
//
// Next.js loads `.env.local` for the UI automatically, but plain
// `node --import tsx` does not. This loader mirrors dotenv's parsing rules so
// worker processes see exactly what the UI sees, without adding a dependency:
//   * leading/trailing whitespace around keys and values is ignored;
//   * comment lines and empty lines are skipped;
//   * an optional `export` prefix is allowed;
//   * double- or single-quoted values are unquoted;
//   * variables already present in `process.env` always win.
//
// Import this module first — app modules capture env values at import time.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_ENV_FILE = ".env.local";

/** Loads a dotenv-style file into `process.env` (without overwriting). */
export function loadEnvFile(
  path = join(process.cwd(), DEFAULT_ENV_FILE)
): NodeJS.ProcessEnv {
  let content: string;

  try {
    content = readFileSync(path, "utf8");
  } catch {
    return process.env;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const assignment = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;

    const eq = assignment.indexOf("=");

    if (eq === -1) continue;

    const key = assignment.slice(0, eq).trim();

    if (!key) continue;

    let value = assignment.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return process.env;
}

export { DEFAULT_ENV_FILE };
