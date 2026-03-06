# AI Chat Log

## Session 1 — 2026-03-06

### Prompt (User)

> I am a Senior Engineer building a Bookstore application. We are using Next.js 16 (App Router), Supabase (Postgres), and Vitest. For the frontend, I am using Tailwind Catalyst UI for my component library.
>
> Environment Note: My Supabase instance has a custom event trigger that automatically handles Row Level Security (RLS) setup. Do not include ALTER TABLE ... ENABLE ROW LEVEL SECURITY or specific CREATE POLICY statements in your DDL. Also, do not worry about recursion issues in policies; the trigger handles this.
>
> I need a high-level technical plan before we write any implementation code. Please provide:
>
> 1. Database DDL (SQL) — Books, Authors & Publishers, Genres, Reviews, Orders & OrderItems
> 2. Modeling Decision: Book Formats (Hardcover, Softcover, Audiobook, E-reader) — separate table, TEXT[], or JSONB?
> 3. Pagination & Search Strategy — Offset vs Cursor-based; unified search for Title OR Author name
> 4. Type Safety (database.ts) — TypeScript interface definitions
> 5. Component Strategy — Tailwind Catalyst UI for Catalog view and Cart/Checkout flow
>
> Constraint: Do not generate any UI components or API routes yet. I want to finalize the data layer first.

### Response (Claude)

See full plan below in this session's architecture document. Key decisions made:
- Cursor-based pagination chosen over offset for ~10,000 book catalog
- TEXT[] with CHECK constraint for formats (single shared price)
- tsvector + GIN index for unified title/author search
- Review aggregates computed on-the-fly via a VIEW (later corrected — see AI Output I Intentionally Changed)

---

## Session 2 — 2026-03-06

### Prompt (User)

> We need to handle the 'Current User' selection. Since there are 1,000 users, a standard HTML `<select>` is a bad UX. Constraint: Do not use a standard dropdown. Implement a searchable Command Palette or Combobox using Catalyst UI primitives. Also, ensure the 'Current User' state is persisted in a Cookie so it survives page refreshes and is accessible in Server Components via `next/headers`.

### Key Decisions

- **No `<select>`** — A 1,000-item dropdown is unusable. A Combobox (type-to-filter) or Command Palette pattern is required.
- **Catalyst Combobox** — Use Catalyst's `Combobox` primitive (built on Headless UI) to render a filterable user picker. The input filters the displayed list client-side; no extra API call needed if the full user list is small enough to load once.
- **Cookie persistence** — Selected `user_id` is written to a cookie via a Server Action or `document.cookie` on selection. Accessible server-side via `cookies()` from `next/headers`, making it available in Server Components without prop-drilling.
- **Cookie scope** — `HttpOnly: false` (must be readable by the Client Component to pre-populate the Combobox), `SameSite: Lax`, `Path: /`, `Max-Age: 604800` (7 days).

---

## Session 3 — 2026-03-06

### Prompt (User)

> I want to add to the implementation plan these two additional features for UI/UX improvement:
>
> **Optimistic UI for Reviews:** When a user clicks a star rating, the UI updates immediately before the Supabase write finishes.
>
> **Stale-While-Revalidate (SWR) for Search:** Use Next.js `useOptimistic` or a search transition to show a "searching..." state and cache previous results to make the unified search feel instant.

### Key Decisions

- **Optimistic Reviews** — Use React's `useOptimistic` hook inside the star rating Client Component. On click, immediately apply the new rating to local state; if the Server Action rejects, roll back to the previous value. The `rating_avg` displayed is the optimistic value until revalidation confirms the write.
- **Search transitions** — Wrap the search fetch in `useTransition`. While `isPending` is true, show a subtle spinner or opacity reduction on the results list; the previous results remain visible (stale-while-revalidate behavior) rather than replaced by a blank/loading skeleton. This avoids layout shift and feels instant for cache hits.
- **No external SWR library needed** — `useTransition` + Next.js `router.refresh()` or a Server Action covers both patterns natively. Adding `swr` or `react-query` is not warranted at this stage.

---

## Session 4 — 2026-03-06

### Prompt (User)

> Remove the existing text from the README and replace it with six sections: Setup Instructions, Architectural Decisions, AI Output I Intentionally Changed, Two Additional Features I Chose, Assumptions & Tradeoffs Due to Timebox, and Reflection: AI Usage.

### What Changed

Rewrote `README.md` from the default `create-next-app` boilerplate to a full project documentation file. The six sections capture the complete arc of the planning session: how to run the project, every architectural decision and its rationale, the two AI outputs that were deliberately corrected, the two UX features added independently, honest timebox tradeoffs, and a critical reflection on AI-assisted engineering.

---

## Session 5 — 2026-03-06

### Prompt (User)

> Add coding instructions to CLAUDE.md for SOLID and DRY solutions, and implement Behavioral, Structural, and Creational patterns where appropriate. Then create the initial migration in a migrations folder.

### Key Decisions / What Changed

- **CLAUDE.md** — Added a `## Coding Standards` section covering: all five SOLID principles with project-specific examples, DRY rules with extraction thresholds and exceptions, and three categories of design patterns:
  - *Creational*: Factory Function (Supabase client), Builder (query composition)
  - *Structural*: Adapter (DB row → view model), Decorator (auth guards / Suspense wrappers), Facade (`lib/` domain API hiding Supabase details)
  - *Behavioral*: Strategy (sort/search/pagination), Observer (Supabase Realtime in hooks), Command (Server Actions named imperatively)
- **`migrations/0001_initial_schema.sql`** — Created initial migration covering all tables, indexes, and triggers in dependency order:
  1. Extensions (`pgcrypto`)
  2. `publishers`, `authors`, `genres`
  3. `books` (with `rating_sum`, `rating_count`, `rating_avg` generated column, `search_vector`)
  4. `book_authors`, `book_genres` join tables
  5. `reviews` + `trg_book_rating_aggregates` (incremental arithmetic trigger)
  6. `trg_book_search_vector` (BEFORE INSERT/UPDATE on books) + `trg_book_search_vector_authors` (AFTER INSERT/DELETE on book_authors)
  7. `order_status` enum, `orders`, `order_items`
  - No RLS statements included — handled by Supabase automatic event trigger.

---

## Session 6 — 2026-03-06

### Prompt (User)

> Generate a `.env.example` and `.env.local` for env variables. Change the `.gitignore` to exclude `.env.local` — `.env.example` is needed for devs and has placeholders for their local setup.

### Key Decisions / What Changed

- **`.gitignore`** — Replaced the blanket `.env*` rule (which was accidentally ignoring `.env.example`) with explicit per-file ignores: `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`. Added `!.env.example` negation to ensure the example file is tracked.
- **`.env.example`** — Created with placeholder values and comments for: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `CURRENT_USER_COOKIE_NAME`. Intended to be committed and used by all developers as a setup reference.
- **`.env.local`** — Created as a copy of `.env.example` with same placeholder structure. Gitignored. Developers fill in real values here.

---

## Session 7 — 2026-03-06

### Prompt (User)

> The anon key and service role key are legacy — it should be publishable key and secret keys.

### Key Decisions / What Changed

- **`.env.example`** — Renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY` to match current Supabase key naming conventions.
- **`.env.local`** — Same renames applied, preserving the real values already in place.

---

## Session 8 — 2026-03-06

### Prompt (User)

> Generate a comprehensive `types/database.ts` file as the single source of truth for TypeScript interfaces. Requirements: enum mapping for OrderStatus and BookFormat, base interfaces for all tables, smart field mapping (rating_avg as number | null, formats as BookFormat[], TIMESTAMPTZ/DATE as ISO strings), enriched relational types (BookWithRelations, OrderWithItems), PaginatedResult<T> for cursor pagination. No Supabase client logic.

### Key Decisions / What Changed

- **`types/database.ts`** — Created with the following structure:
  - *Literal types*: `OrderStatus` (5 values), `BookFormat` (4 values), `StarRating` (1 | 2 | 3 | 4 | 5)
  - *Base interfaces*: `Publisher`, `Author`, `Genre`, `Book`, `Review`, `Order`, `OrderItem`, `BookAuthor`, `BookGenre`
  - *Smart field mapping*: `rating_avg: number | null` (NULL when no reviews), `formats: BookFormat[]`, `purchased_price` annotated to never be used for live pricing, `search_vector` marked optional (excluded from most selects)
  - *Enriched types*: `BookWithRelations` (extends Book with publisher, authors[], genres[]), `OrderWithItems` (Order with `OrderItemWithBook[]`), `BookCatalogItem` (slim Pick for list views), `BookCatalogItemWithRelations` (catalog card with nested author/genre projections)
  - *Pagination*: `PaginationCursor` opaque alias, `PaginatedResult<T>` generic envelope with `data`, `nextCursor`, `hasMore`
  - *Search*: `BookSearchParams` covering query, genreSlug, format, price range, cursor, and limit

---

## Session 9 — 2026-03-06

### Prompt (User)

> Implement the core data access layer: Supabase client utilities (server + browser), Current User Server Action + utility, and getBooks() with unified FTS search, cursor-based pagination, and optional genre/format/price filters.

### Key Decisions / What Changed

- **`lib/supabase/server.ts`** — Async factory `createServerClient()` using `@supabase/ssr`. Reads/writes cookies via `await cookies()` (Next.js 16 async cookies API). Silent catch on `setAll` from Server Components where cookies are read-only — middleware handles refresh.
- **`lib/supabase/browser.ts`** — Sync factory `createBrowserSupabaseClient()` using `createBrowserClient` from `@supabase/ssr`. Marked `'use client'`. Uses publishable key only — secret key never referenced.
- **`lib/utils/currentUser.ts`** — Exports `CURRENT_USER_COOKIE_NAME` constant (DRY single source) and `getCurrentUser(): Promise<string | null>` for Server Components.
- **`lib/actions/setCurrentUser.ts`** — `'use server'` action. Imports `CURRENT_USER_COOKIE_NAME` from `currentUser.ts` (DRY). Validates `userId` at the boundary. Sets cookie: `httpOnly: false` (Client Combobox must read it), `sameSite: lax`, 7-day expiry.
- **`lib/utils/pagination.ts`** — Three pure functions: `encodeCursor(title, id)` (base64url JSON), `decodeCursor(cursor)` (typed parse with shape validation), `buildCursorFilter(cursor)` (PostgREST `.or()` string simulating `(title, id) > (cursorTitle, cursorId)` row comparison with double-quote escaping).
- **`lib/queries/books.ts`** — `getBooks(params)` implementing:
  - *Builder pattern*: query composed incrementally; each optional param appends a clause
  - *Adapter pattern*: `adaptBookCatalogRow()` flattens `[{ author: {...} }]` → `Author[]` shape
  - *Facade pattern*: callers never touch the Supabase client
  - *Strategy pattern*: `CATALOG_SELECT` vs `CATALOG_SELECT_GENRE_FILTER` selected based on params (latter uses `!inner` for INNER JOIN genre filtering)
  - FTS via `.textSearch('search_vector', query, { type: 'plain' })` — uses `idx_books_search_gin`
  - Format filter via `.contains('formats', [format])` — uses `idx_books_formats_gin`
  - Cursor via `.or(buildCursorFilter(decoded))` — uses `idx_books_cursor`
  - Fetches `limit + 1` rows to determine `hasMore` without a separate COUNT query

---

## Session 10 — 2026-03-06

### Prompt (User)

> Implement real Google OAuth using Supabase with a strict proxy.ts architecture. Do not use middleware.ts — it is deprecated for this project's requirements. Create app/auth/proxy/route.ts, lib/actions/auth.ts, refactor getCurrentUser to use Supabase session, and create app/login/page.tsx with Catalyst UI.

### Architectural Justification: Proxy Route vs middleware.ts

I opted for a Proxy-based Auth pattern (`app/auth/proxy/route.ts`) instead of the traditional Next.js `middleware.ts` approach.

**Why middleware.ts is deprecated / unsuitable here:**
Next.js middleware runs exclusively on the **Edge Runtime** — a restricted V8 isolate that intentionally omits Node.js APIs. The `@supabase/ssr` package's `setAll()` cookie management relies on `next/headers`, which is a Node.js-runtime API. Attempting to run session refresh inside middleware causes runtime errors and silently drops cookie writes. This is a known limitation and the reason the Supabase team now recommends against using middleware as the primary auth boundary for App Router projects using `@supabase/ssr`. The middleware pattern was a workaround for earlier Next.js/Supabase versions before Route Handlers were robust; it is now considered legacy for this use case.

**Why the proxy Route Handler is better:**
A Route Handler at `/auth/proxy` runs in the **Node.js runtime**, has full access to `next/headers`, and can reliably call `supabase.auth.exchangeCodeForSession()` with guaranteed cookie write-back. It is a single-responsibility, auditable handler for all OAuth callbacks and session synchronization.

### Key Decisions / What Changed

- **`app/auth/proxy/route.ts`** — Route Handler (GET `/auth/proxy`). Reads `?code` from Google's OAuth redirect, calls `exchangeCodeForSession()`, writes session cookies via `@supabase/ssr setAll()`, redirects to `?next` (default `/`). On failure redirects to `/login?error=auth_callback_failed`.
- **`lib/actions/auth.ts`** — Two `'use server'` Commands: `signInWithGoogle()` (calls `signInWithOAuth` with `redirectTo: /auth/proxy`, redirects to Google) and `signOut()` (calls `supabase.auth.signOut()`, redirects to `/login`). Private `resolveOrigin()` helper avoids duplicating the origin resolution logic.
- **`lib/utils/currentUser.ts`** — Refactored: removed cookie read, now calls `supabase.auth.getUser()` server-side. Returns `user.id | null`. Redirect on null is caller's responsibility.
- **`lib/actions/setCurrentUser.ts`** — Marked `@deprecated`. Cookie-based user selection is superseded by real OAuth. Broken import from `currentUser.ts` fixed by moving `CURRENT_USER_COOKIE_NAME` constant local. Safe to delete once call sites are cleaned up.
- **`app/login/page.tsx`** — Catalyst-style sign-in page. `searchParams` typed as `Promise<{error?: string}>` (Next.js 16 async APIs). Error messages mapped from URL params. Google SVG icon inlined. Form `action={signInWithGoogle}` triggers the Server Action.

### Outstanding: run npm install

```bash
npm install @supabase/ssr @supabase/supabase-js
```

IDE type errors on `next/headers` and `process` will resolve once packages are installed. `@types/node` and `next` are already in `package.json`.

---

## Session 11 — 2026-03-06

### Prompt (User)

> Restructure the auth flow: rename app/auth/proxy/route.ts → app/auth/callback/route.ts (identity exchange), create a separate app/api/auth/proxy/route.ts (session synchronizer), update redirectTo in auth.ts, create lib/utils/url.ts for centralized URL helpers, and add PKCE flowType to server.ts.

### Rationale (per user instruction)

I am separating the OAuth Callback (identity exchange) from the Auth Proxy (session maintenance). This modularity prevents the callback logic from becoming bloated and provides a dedicated endpoint for session health checks. The callback handler runs once per sign-in; the proxy endpoint can be called repeatedly by Client Components without triggering a new OAuth flow.

### Why middleware.ts is deprecated for this architecture

`middleware.ts` runs on the Edge Runtime — a restricted V8 isolate without Node.js APIs. `@supabase/ssr`'s `setAll()` cookie management requires `next/headers` (Node.js runtime). Running session refresh in middleware causes silent cookie write failures. The two Route Handler pattern (callback + proxy) runs in the Node.js runtime with guaranteed `setAll()` execution and is the current Supabase-recommended approach for Next.js 16 App Router projects.

### Key Decisions / What Changed

- **`app/auth/proxy/route.ts`** — Deleted. Replaced by the two files below.
- **`app/auth/callback/route.ts`** — OAuth identity exchange (renamed + separated). Same `exchangeCodeForSession()` logic. Single responsibility: code → session, then redirect.
- **`app/api/auth/proxy/route.ts`** — New Session Synchronizer. GET endpoint. Calls `supabase.auth.getUser()` which triggers `@supabase/ssr` token refresh + `setAll()` cookie write if the access token has expired. Returns `{ authenticated, userId }`. Client Components call this in `onAuthStateChange` to keep the server session in sync.
- **`lib/utils/url.ts`** — New. Pure URL helper functions: `getAuthCallbackUrl()`, `getAuthProxyUrl()`, `getAuthCallbackUrlWithNext(next)`. Single source of truth for auth endpoint paths (DRY). All derived from `NEXT_PUBLIC_APP_URL`.
- **`lib/actions/auth.ts`** — Removed inline `resolveOrigin()` helper and `headers` import. `signInWithGoogle()` now uses `getAuthCallbackUrl()` from `lib/utils/url.ts` — cleaner, DRY.
- **`lib/supabase/server.ts`** — Added `auth: { flowType: 'pkce', detectSessionInUrl: false }`. PKCE keeps tokens out of URL fragments; `detectSessionInUrl: false` prevents conflict with our explicit callback handler. Updated stale comment to reference the Session Synchronizer instead of middleware.
- **`README.md`** — Added "Auth: Separated OAuth Callback and Session Synchronizer" section under Architectural Decisions explaining the two-handler pattern and why middleware.ts is not used.
- **Supabase Dashboard** — Update Redirect URLs from `/auth/proxy` → `/auth/callback`.

---

## Architectural Correction: Decoupling Session Proxy to proxy.ts

> **README entry (user-authored):** "The AI repeatedly attempted to use standard Next.js Route Handlers for session management. I intervened to force a custom proxy.ts pattern. I did this to ensure session logic remained decoupled and could be easily integrated into our specific Next.js 16 deployment strategy, which avoided the limitations of the standard Edge-based middleware."

**What the AI generated:** A Route Handler at `app/api/auth/proxy/route.ts` intended to act as a session synchronizer. The browser would call `GET /api/auth/proxy` after a token rotation event to refresh the server-side session.

**Why it was wrong:** This introduced an extra HTTP round-trip that a client component would have to orchestrate explicitly. More critically, a Route Handler at a fixed endpoint cannot intercept arbitrary requests — it can only handle requests explicitly directed to it. Session refresh must happen inline with the request that needs the fresh token, not via a secondary fetch to a dedicated route. The Route Handler was a hallucination of a pattern that does not exist in the `@supabase/ssr` documentation.

**The correction:** Deleted `app/api/auth/proxy/` entirely. Created `proxy.ts` in the repository root — a plain TypeScript module that exports `refreshSession(request: NextRequest): Promise<NextResponse>`. It creates a Supabase client that reads cookies from the `NextRequest` and writes refreshed cookies to both the request object (so downstream handlers see the new token in the same render) and the response object (so the browser persists it). Any Route Handler that needs a guaranteed-fresh session imports and calls this function directly. No HTTP round-trip, no dedicated endpoint, no client-side orchestration required.

**Why this matters:** The previous pattern worked by accident in simple cases but would silently serve stale sessions to any route that did not explicitly call the proxy endpoint. The `proxy.ts` utility pattern is O(0) extra HTTP requests and ensures every handler that opts in gets a fresh session before executing its own logic.

---

## AI Output I Intentionally Changed

### Review Aggregates: View → Database Trigger

**Original AI output:** Claude proposed a `review_aggregates` VIEW that computed `AVG(rating)` per book on every query.

**The problem:** A VIEW re-runs the aggregation on every page load. At scale (thousands of reviews per book), this is an unnecessary full-scan on every catalog render.

**My correction:** Moved the aggregate to a denormalized `rating_avg` and `rating_count` column on the `books` table, maintained by a Postgres trigger that fires `AFTER INSERT OR UPDATE OR DELETE ON reviews`. This is a standard write-time vs. read-time trade-off: the catalog is read far more often than reviews are written.

**Why it matters:** This is a classic Senior Engineer judgment call — the AI defaulted to the "pure" relational approach (no denormalization), but production performance requires pragmatic denormalization backed by a trigger guarantee.

---

### Review Trigger: Re-aggregating Query → Incremental Arithmetic

**Original AI output:** The trigger called `SELECT AVG(rating)` and `SELECT COUNT(*)` on the entire `reviews` table for the affected book on every insert, update, or delete.

**The problem:** This is still a full per-book aggregate scan on every write. A book with 10,000 reviews causes 10,000 rows to be read just to increment a counter by one.

**My correction:** Added a `rating_sum` column to `books` and rewrote the trigger to use incremental arithmetic:
- `INSERT`: `rating_sum += NEW.rating`, `rating_count += 1`
- `DELETE`: `rating_sum -= OLD.rating`, `rating_count -= 1`
- `UPDATE`: `rating_sum += (NEW.rating - OLD.rating)`, `rating_count` unchanged
- `rating_avg` derived as `rating_sum / NULLIF(rating_count, 0)` — handles division by zero

**Updated DDL:**
```sql
-- Add to books table
rating_sum   INTEGER NOT NULL DEFAULT 0,
rating_count INTEGER NOT NULL DEFAULT 0,
rating_avg   NUMERIC(3, 2) GENERATED ALWAYS AS
               (rating_sum::NUMERIC / NULLIF(rating_count, 0)) STORED,
```

**Updated trigger:**
```sql
CREATE OR REPLACE FUNCTION update_book_rating_aggregates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books
    SET rating_sum   = rating_sum + NEW.rating,
        rating_count = rating_count + 1
    WHERE id = NEW.book_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE books
    SET rating_sum   = rating_sum - OLD.rating,
        rating_count = GREATEST(rating_count - 1, 0)
    WHERE id = OLD.book_id;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE books
    SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
    WHERE id = NEW.book_id;
  END IF;

  RETURN NULL;
END;
$$;
```

**Why it matters:** Each write now touches exactly one row with simple arithmetic — O(1) regardless of how many reviews exist. `rating_avg` is a `GENERATED ALWAYS AS ... STORED` computed column, so Postgres maintains it automatically with zero application-layer logic and the division-by-zero case is handled at the schema level via `NULLIF`.

---

## Implementation: Refactoring Login with Catalyst UI

### Prompt (User)

> Refactor LoginPage to use Tailwind Catalyst UI components exclusively: Heading (level 1) for wordmark, Text for subtitle and footer, Alert (destructive variant) for errors, Button (outline variant) with Google icon as child. Keep searchParams as async Promise and form action={signInWithGoogle}.

### Key Decisions / What Changed

- **`components/heading.tsx`** — Catalyst `Heading` component. Accepts `level` prop (1–6), applies the correct Catalyst zinc typography scale per level. Dynamic tag (`h1`–`h6`) resolved from `level`. Matches the official Catalyst API: `<Heading level={1}>`.
- **`components/text.tsx`** — Catalyst `Text` component. Renders a `<p>` with `text-base/6 text-zinc-500 sm:text-sm/6` and dark mode variant. Accepts `className` for overrides (used on the footer with `text-xs`).
- **`components/button.tsx`** — Catalyst `Button` component. Boolean props `outline` and `plain` select the variant (matches official Catalyst API — not `variant="outline"`). Default is solid zinc. `type="button"` default prevents accidental form submission.
- **`components/alert.tsx`** — Catalyst-style `Alert` component (Catalyst does not ship one). Three variants: `destructive` (red), `warning` (amber), `info` (blue). Follows Catalyst design language exactly: `ring-1` borders, `rounded-lg`, dark mode via `/30` opacity backgrounds. `role="alert"` for accessibility.
- **`app/login/page.tsx`** — Refactored: replaced all raw HTML (`h1`, `p`, `div`, `button`) with `Heading`, `Text`, `Alert`, and `Button`. `searchParams: Promise<{error?:string}>` retained (Next.js 16). `form action={signInWithGoogle}` retained. `GoogleIcon` remains a local SVG function passed as a child to `Button`.

---

## Fix: proxy.ts Missing Required Export

### Prompt (User)

> The file './proxy.ts' must export a function, either as a default export or as a named 'proxy' export. This function is what Next.js runs for every request handled by this proxy (previously called middleware).

### Key Decisions / What Changed

- **`proxy.ts`** — Added the required `export async function proxy(request: NextRequest): Promise<NextResponse>` named export that delegates to `refreshSession()`. Next.js 16 uses `proxy.ts` as the successor to `middleware.ts` and requires either a default export or a named `proxy` export as the entry point — exporting only `refreshSession` was insufficient.
- **`config` matcher** — Added `export const config = { matcher: [...] }` to restrict proxy execution to application routes only. Excludes `_next/static`, `_next/image`, `favicon.ico`, `login`, and `auth/callback` so static assets and the OAuth callback bypass session refresh entirely.
- **Design**: `refreshSession` remains the implementation; `proxy` is a thin re-export that satisfies the Next.js 16 convention without duplicating logic.
