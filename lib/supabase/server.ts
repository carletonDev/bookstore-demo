import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Factory: Server-side Supabase client.
 *
 * Use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes the session cookie automatically so RLS policies
 * receive the correct user context.
 *
 * Pattern: Factory Function (Creational) — never instantiate inline.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // PKCE is the recommended OAuth flow for Next.js App Router.
        // The authorization code is exchanged server-side in app/auth/callback/route.ts,
        // keeping tokens out of the URL fragment and safe from referrer leakage.
        flowType: "pkce",
        // Session URL detection is disabled — our callback route handles the
        // code exchange explicitly. Allowing auto-detection would conflict with
        // the proxy-based session architecture.
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Token refresh is handled by the Session Synchronizer at
            // /api/auth/proxy, not by middleware.
          }
        },
      },
    },
  );
}
