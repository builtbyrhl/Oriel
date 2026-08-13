// Browser-safe Supabase client.
//
// Uses only NEXT_PUBLIC_* values (public anon key). Safe to import anywhere,
// including client components. Reads are governed by RLS policies rather than
// a privileged key.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client with anonymous/public privileges.
 *
 * Returns null when the public configuration is not present so client code
 * can render gracefully without a database configured.
 */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cached;
}

/** Whether the browser-safe Supabase client can be constructed. */
export function isBrowserSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}