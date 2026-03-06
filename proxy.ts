import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Session Proxy — repository root utility, NOT a Next.js Route Handler.
 *
 * Responsibility: refresh the Supabase session on every request by reading
 * cookies from the incoming NextRequest and writing updated session cookies
 * back to the outgoing NextResponse.
 *
 * Why this lives in proxy.ts (root) instead of a Route Handler:
 *   A Route Handler at /api/auth/proxy was an architectural error — it
 *   introduced an extra HTTP round-trip and could not intercept arbitrary
 *   requests. Session refresh must happen inline with the request that
 *   needs it, not via a separate fetch. This module exports a function that
 *   any Route Handler or layout can call directly, keeping the session
 *   maintenance logic decoupled from any single endpoint.
 *
 * Cookie strategy:
 *   getAll()  — reads from request.cookies (the incoming request)
 *   setAll()  — writes to BOTH the request object (for downstream use within
 *               the same render) AND the response object (for the browser to
 *               persist the refreshed token)
 *
 * Usage:
 *   import { refreshSession } from '@/proxy'
 *
 *   // Inside a Route Handler:
 *   export async function GET(request: NextRequest) {
 *     const { response, user } = await refreshSession(request)
 *     // response already carries refreshed Set-Cookie headers
 *     return response
 *   }
 */
interface SessionResult {
  response: NextResponse
  user: { id: string } | null
}

export async function refreshSession(request: NextRequest): Promise<SessionResult> {
  // Start with a pass-through response — the request is forwarded as-is.
  // If token rotation occurs, this will be rebuilt below to carry new cookies.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Read all cookies from the original request.
        getAll() {
          return request.cookies.getAll()
        },
        // Called by @supabase/ssr when it needs to write a refreshed token.
        // Must update BOTH the request (so Server Components in this render
        // see the new token) and the response (so the browser stores it).
        setAll(cookiesToSet) {
          // Mutate request cookies so downstream handlers read fresh values.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          // Rebuild the response from the mutated request so Next.js forwards
          // the updated cookies to the browser.
          response = NextResponse.next({ request })

          // Write each refreshed cookie onto the new response.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() performs JWT validation with the Supabase Auth server.
  // If the access token is expired, @supabase/ssr uses the refresh token
  // to obtain a new pair and triggers setAll() above — transparently rotating
  // the session without any additional application logic.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}

/**
 * Routes that require an authenticated session.
 * Unauthenticated requests to these paths are redirected to /login.
 */
const PROTECTED_ROUTES = ['/catalog', '/reports', '/orders']

/**
 * Named "proxy" export — required by Next.js 16 to recognize this file as the
 * request proxy (successor to middleware.ts). Delegates to refreshSession()
 * which contains the full implementation, then enforces route-level authorization.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await refreshSession(request)

  // Authorization: redirect unauthenticated users away from protected routes.
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

/**
 * Matcher config — limits proxy execution to application routes only.
 * Excludes static assets, image optimization, favicon, login page, and the
 * OAuth callback so those requests bypass session refresh entirely.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|login|auth/callback).*)',
  ],
}
