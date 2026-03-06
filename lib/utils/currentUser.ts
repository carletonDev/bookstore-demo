import { createServerClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user's ID from the active Supabase session.
 *
 * Uses supabase.auth.getUser() which validates the JWT server-side on every
 * call — not a cached value. Returns null when:
 *  - No session cookie is present (unauthenticated)
 *  - The session has expired and could not be refreshed
 *  - The Supabase call returns an error
 *
 * Redirect logic on null is the responsibility of the calling Page or layout,
 * not this utility.
 *
 * Previously: read a manually-set cookie. Superseded by real Google OAuth
 * via the proxy route (app/auth/proxy/route.ts).
 */
export async function getCurrentUser(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
}
