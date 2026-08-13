// Server-only Supabase client.
//
// Uses the service-role key. This module MUST only be imported from server
// code (route handlers, server components, scripts). Never import it from a
// client component — that would ship the service-role key to the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client with service-role privileges.
 *
 * Construction is lazy so the module can be imported at build time without
 * throwing when environment variables are missing (e.g. during `next build`
 * or unit tests). A descriptive error is thrown only when the client is
 * actually requested and the configuration is incomplete.
 */
export function getServerSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase server client is not configured. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "environment variables."
    );
  }

  cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}

/** Whether the server-side Supabase client can be constructed. */
export function isServerSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}