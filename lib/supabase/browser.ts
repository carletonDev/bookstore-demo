"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Factory: Browser-side Supabase client.
 *
 * Use only in Client Components ('use client').
 * Uses the publishable key — subject to RLS.
 * Never use SUPABASE_SECRET_KEY on the client.
 *
 * Pattern: Factory Function (Creational) — never instantiate inline.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
