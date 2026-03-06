/**
 * Centralized auth URL helpers.
 *
 * All auth-related redirect URLs are derived from getURL() here.
 * If an endpoint path changes, update it in one place — not across every
 * action, route, and component that constructs an absolute URL.
 *
 * Pattern: DRY — single source of truth for auth endpoint paths.
 * All functions are pure (no side effects).
 */

/**
 * Resolves the application base URL without a trailing slash.
 *
 * Priority:
 *   1. NEXT_PUBLIC_VERCEL_URL — set automatically by Vercel for every
 *      deployment (preview and production). Uses https://.
 *   2. http://localhost:3000 — local development fallback.
 *
 * NEXT_PUBLIC_APP_URL is intentionally NOT used: it requires manual
 * configuration per environment and was the root cause of the localhost
 * redirect on Vercel deployments.
 */
export function getURL(): string {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

/**
 * The OAuth callback URL — passed as `redirectTo` in signInWithOAuth().
 * Google redirects here after the user approves access.
 * Handler: app/auth/callback/route.ts
 */
export function getAuthCallbackUrl(): string {
  return `${getURL()}/auth/callback`
}

/**
 * The session synchronizer URL — called by Client Components to refresh
 * and sync the server-side session after a client-side token rotation.
 * Handler: app/api/auth/proxy/route.ts
 */
export function getAuthProxyUrl(): string {
  return `${getURL()}/api/auth/proxy`
}

/**
 * Builds a callback URL that carries a `next` destination, so the callback
 * handler can redirect the user to their originally intended page after sign-in.
 */
export function getAuthCallbackUrlWithNext(next: string): string {
  const encoded = encodeURIComponent(next.startsWith('/') ? next : `/${next}`)
  return `${getAuthCallbackUrl()}?next=${encoded}`
}
