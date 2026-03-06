import { createServerClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * Returns the authenticated user's profile from the Google OAuth metadata.
 *
 * Extracts full_name, email, and avatar_url from the Supabase user object
 * which is populated by Google OAuth. Returns null when unauthenticated.
 *
 * Redirect logic on null is the responsibility of the calling Page or layout.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    fullName: meta.full_name ?? meta.name ?? "Reader",
    email: user.email ?? "",
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}
