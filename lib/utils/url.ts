/**
 * Centralized auth URL helpers.
 *
 * All auth-related redirect URLs are derived from NEXT_PUBLIC_APP_URL here.
 * If an endpoint path changes, update it in one place — not across every
 * action, route, and component that constructs an absolute URL.
 *
 * Pattern: DRY — single source of truth for auth endpoint paths.
 * All functions are pure (no side effects).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

/**
 * The OAuth callback URL — passed as `redirectTo` in signInWithOAuth().
 * Google redirects here after the user approves access.
 * Handler: app/auth/callback/route.ts
 */
export function getAuthCallbackUrl(): string {
  return `${APP_URL}/auth/callback`
}

/**
 * The session synchronizer URL — called by Client Components to refresh
 * and sync the server-side session after a client-side token rotation.
 * Handler: app/api/auth/proxy/route.ts
 */
export function getAuthProxyUrl(): string {
  return `${APP_URL}/api/auth/proxy`
}

/**
 * Builds a callback URL that carries a `next` destination, so the callback
 * handler can redirect the user to their originally intended page after sign-in.
 */
export function getAuthCallbackUrlWithNext(next: string): string {
  const base = getAuthCallbackUrl()
  const encoded = encodeURIComponent(next.startsWith('/') ? next : `/${next}`)
  return `${base}?next=${encoded}`
}
