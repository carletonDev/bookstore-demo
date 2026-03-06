import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * OAuth Callback — GET /auth/callback
 *
 * Single responsibility: exchange the Google OAuth authorization code for a
 * Supabase session, then redirect the user to the catalog (The Library).
 *
 * This handler intentionally does nothing else. Session refresh for subsequent
 * requests is handled by proxy.ts (repository root), which is called inline
 * by any Route Handler that requires a valid session — not through a
 * dedicated HTTP endpoint.
 *
 * Flow:
 *   1. Google redirects here with ?code=<auth_code>
 *   2. exchangeCodeForSession() trades the code for access + refresh tokens
 *   3. @supabase/ssr writes session cookies to the response via setAll()
 *   4. User is redirected to /catalog (The Library)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/catalog`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
