// Live smoke check for the oriel_discovery_candidates RPC — exercises the
// actual SQL filtering paths (genre, mood, intersection, mediaType, limit)
// against the live Supabase database using the service-role client.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

async function rpc(name, params) {
  const { data, error } = await db.rpc("oriel_discovery_candidates", params);
  if (error) throw new Error(`${name}: ${error.message}`);
  return { name, count: data?.length ?? 0, rows: data ?? [] };
}

async function run() {
  const genre = await rpc("genre=horror", {
    p_genre: "horror",
    p_mood: null,
    p_media_type: null,
    p_limit: 10,
  });

  const mood = await rpc("mood=tense", {
    p_genre: null,
    p_mood: "tense",
    p_media_type: null,
    p_limit: 10,
  });

  const intersection = await rpc("genre=horror,mood=tense", {
    p_genre: "horror",
    p_mood: "tense",
    p_media_type: null,
    p_limit: 10,
  });

  const moviesOnly = await rpc("mediaType=movie,genre=horror", {
    p_genre: "horror",
    p_mood: null,
    p_media_type: "movie",
    p_limit: 10,
  });

  const noMatch = await rpc("genre=xyzzy (no match)", {
    p_genre: "xyzzy",
    p_mood: null,
    p_media_type: null,
    p_limit: 10,
  });

  for (const r of [genre, mood, intersection, moviesOnly, noMatch]) {
    console.log(`${r.name} -> ${r.count} row(s)`);
    for (const row of r.rows.slice(0, 5)) {
      console.log(`  [${row.media_type}] ${row.title} | genres=${row.genres?.join(",")} | version=${row.version}`);
    }
  }
}

run().catch((err) => {
  console.error("SMOKE CHECK FAILED:", err.message);
  process.exitCode = 1;
});