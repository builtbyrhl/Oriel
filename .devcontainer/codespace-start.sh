#!/usr/bin/env bash
# Auto-expand the Oriel catalogue every time this Codespace starts.
#
# Runs the catalogue worker in the background (no blocking of the container):
#   1. ensures dependencies are installed (fresh clones have no node_modules);
#   2. bootstraps app/ui/.env.local from Codespaces repo/user secrets when the
#      file is missing (it is git-ignored, so fresh clones have no keys);
#   3. launches the worker (expansion + a small enrichment batch) unless a
#      previous run is still going.
#
# Requires these Codespaces secrets to do anything useful (else it logs and
# skips, without failing the container):
#   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#   NEXT_PUBLIC_TMDB_API_KEY, GEMINI_API_KEY (or OPENROUTER_API_KEY)
#
# Tunables (env overrides): ORIEL_TARGET, ORIEL_ENRICH_CAP.
# Logs: /tmp/oriel-autocrawl.log (cleared on container stop).

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/app/ui"
LOG=/tmp/oriel-autocrawl.log
LOCK=/tmp/oriel-autocrawl.pid
TARGET="${ORIEL_TARGET:-5000}"
ENRICH_CAP="${ORIEL_ENRICH_CAP:-20}"

echo "[oriel] auto-expand start $(date -Is)" >> "$LOG"

# 1. Dependencies (fresh clone has no node_modules).
if [ ! -d "$APP/node_modules" ]; then
  echo "[oriel] installing dependencies..." >> "$LOG"
  (cd "$APP" && npm install --no-audit --no-fund >> "$LOG" 2>&1)
fi

# 2. Bootstrap .env.local from injected Codespaces secrets.
if [ ! -f "$APP/.env.local" ]; then
  : > "$APP/.env.local"
  for k in NEXT_PUBLIC_TMDB_API_KEY NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY \
    ORIEL_INGESTION_TOKEN GEMINI_API_KEY GEMINI_API_KEYS OPENROUTER_API_KEY \
    ORIEL_AI_PROVIDER; do
    v="${!k:-}"
    if [ -n "$v" ]; then
      printf '%s=%s\n' "$k" "$v" >> "$APP/.env.local"
    fi
  done
  echo "[oriel] .env.local bootstrapped from Codespaces secrets" >> "$LOG"
fi

# 3. Worker fails hard without Supabase + an AI key; skip cleanly if missing.
missing=""
for k in NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if ! grep -qE "^[[:space:]]*$k=" "$APP/.env.local"; then missing="$missing $k"; fi
done
ai=""
for k in GEMINI_API_KEY GEMINI_API_KEYS OPENROUTER_API_KEY; do
  if grep -qE "^[[:space:]]*$k=" "$APP/.env.local"; then ai="yes"; break; fi
done
if [ -n "$missing" ]; then
  echo "[oriel] skipped: missing$missing (add repo Codespaces secrets)" >> "$LOG"
  exit 0
fi
if [ -z "$ai" ]; then
  echo "[oriel] skipped: no AI key (set GEMINI_API_KEY or OPENROUTER_API_KEY)" >> "$LOG"
  exit 0
fi

# 4. One run per container lifetime.
if [ -f "$LOCK" ]; then
  pid="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "[oriel] already running (pid $pid) — skipping" >> "$LOG"
    exit 0
  fi
  rm -f "$LOCK"
fi

# 5. Launch in the background.
cd "$APP" || exit 0
nohup npx --no-install tsx worker/catalogue-worker.ts \
  --target="$TARGET" --enrichCap="$ENRICH_CAP" >> "$LOG" 2>&1 &
WPID=$!
echo "$WPID" > "$LOCK"
disown "$WPID" 2>/dev/null || true
echo "[oriel] launched worker pid $WPID target=$TARGET enrichCap=$ENRICH_CAP" >> "$LOG"
