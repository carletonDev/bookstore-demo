"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/utils/url";
import { redirect } from "next/navigation";

/**
 * Server Action: initiate Google OAuth sign-in.
 *
 * Calls Supabase to generate the Google OAuth authorization URL, then
 * redirects the user there. The redirectTo points at /auth/callback which
 * handles the code exchange and cookie setup on return.
 *
 * redirectTo is resolved from lib/utils/url.ts — the single source of truth
 * for auth endpoint URLs (DRY).
 *
 * Pattern: Command (Behavioral) — single responsibility, imperative name.
 */
export async function signInWithGoogle(): Promise<never> {
  const supabase = await createServerClient();

  // Purge any stale or partial session before starting a new OAuth flow.
  // Without this, a leftover PKCE code_verifier cookie from a previous
  // failed attempt causes Supabase to reject the new code exchange —
  // the root cause of the "first click fails, second click works" bug.
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(),
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_init_failed");
  }

  redirect(data.url);
}

/**
 * Server Action: sign the current user out.
 *
 * Calls Supabase signOut() which invalidates the session server-side and
 * clears the session cookies via the @supabase/ssr setAll() callback.
 * Redirects to the public landing page (/) on completion.
 *
 * Pattern: Command (Behavioral) — single responsibility, imperative name.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
