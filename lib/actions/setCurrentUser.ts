"use server";

/**
 * @deprecated
 * This Server Action was used when the app had a manual "Current User"
 * cookie selector instead of real authentication. It is superseded by
 * Google OAuth via signInWithGoogle() in lib/actions/auth.ts and the
 * proxy route at app/auth/proxy/route.ts.
 *
 * Retained to avoid breaking imports during the auth migration.
 * Safe to remove once all call sites have been updated.
 */

import { cookies } from "next/headers";

// Local constant — no longer exported from lib/utils/currentUser.ts
// which now resolves the user from the Supabase session.
const CURRENT_USER_COOKIE_NAME =
  process.env.CURRENT_USER_COOKIE_NAME ?? "bookstore_current_user";

export async function setCurrentUser(userId: string): Promise<void> {
  if (!userId || typeof userId !== "string") {
    throw new Error("setCurrentUser: userId must be a non-empty string");
  }

  const cookieStore = await cookies();

  cookieStore.set(CURRENT_USER_COOKIE_NAME, userId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
