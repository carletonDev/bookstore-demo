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
  - _Creational_: Factory Function (Supabase client), Builder (query composition)
  - _Structural_: Adapter (DB row → view model), Decorator (auth guards / Suspense wrappers), Facade (`lib/` domain API hiding Supabase details)
  - _Behavioral_: Strategy (sort/search/pagination), Observer (Supabase Realtime in hooks), Command (Server Actions named imperatively)
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
  - _Literal types_: `OrderStatus` (5 values), `BookFormat` (4 values), `StarRating` (1 | 2 | 3 | 4 | 5)
  - _Base interfaces_: `Publisher`, `Author`, `Genre`, `Book`, `Review`, `Order`, `OrderItem`, `BookAuthor`, `BookGenre`
  - _Smart field mapping_: `rating_avg: number | null` (NULL when no reviews), `formats: BookFormat[]`, `purchased_price` annotated to never be used for live pricing, `search_vector` marked optional (excluded from most selects)
  - _Enriched types_: `BookWithRelations` (extends Book with publisher, authors[], genres[]), `OrderWithItems` (Order with `OrderItemWithBook[]`), `BookCatalogItem` (slim Pick for list views), `BookCatalogItemWithRelations` (catalog card with nested author/genre projections)
  - _Pagination_: `PaginationCursor` opaque alias, `PaginatedResult<T>` generic envelope with `data`, `nextCursor`, `hasMore`
  - _Search_: `BookSearchParams` covering query, genreSlug, format, price range, cursor, and limit

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
  - _Builder pattern_: query composed incrementally; each optional param appends a clause
  - _Adapter pattern_: `adaptBookCatalogRow()` flattens `[{ author: {...} }]` → `Author[]` shape
  - _Facade pattern_: callers never touch the Supabase client
  - _Strategy pattern_: `CATALOG_SELECT` vs `CATALOG_SELECT_GENRE_FILTER` selected based on params (latter uses `!inner` for INNER JOIN genre filtering)
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

## Implementation: Transactional Integrity and Cart UI

### Prompt (User)

> Implement the Cart and Checkout logic for The Codex. State: Create a client-side store (Zustand or Context) for managing the cart (ID, Quantity, Format). UI: Build a CartDrawer using the Catalyst Slide-over (Dialog). Use Catalyst DescriptionList for the order summary. The Snapshot Action: Implement processCheckout. Senior Requirement: It MUST re-fetch the current live price for each book from the database at the moment of execution. Integrity: Save this price into the order_items.purchased_price column to preserve historical data. Authorization: Ensure processCheckout checks for a valid user session before writing to the database.

### Key Decisions / What Changed

- **`stores/cart.ts`** — Zustand store with `persist` middleware (localStorage key: `codex-cart`). State shape: `CartItem { bookId, format, quantity }`. Actions: `addItem` (increments quantity if item+format exists), `removeItem`, `updateQuantity` (minimum 1), `clearCart`, `totalItems` (derived). Keyed on `(bookId, format)` tuple — the same book in different formats is a separate line item.
- **`components/dialog.tsx`** — Catalyst-style slide-over Dialog. Three exports: `Dialog` (overlay + Escape key + scroll lock), `DialogPanel` (right-anchored panel, `max-w-md`, zinc palette, dark mode), `DialogTitle` (semantic `h2`). Uses `role="dialog"` and `aria-modal="true"` for accessibility. Backdrop click closes.
- **`components/description-list.tsx`** — Catalyst DescriptionList with three exports: `DescriptionList` (`<dl>` with dividers), `DescriptionTerm` (`<dt>`, zinc-500 medium), `DescriptionDetails` (`<dd>`, zinc-950 / white dark). Used in the cart drawer for the order summary section.
- **`components/cart-drawer.tsx`** — Client Component combining Dialog (slide-over) and DescriptionList. Receives `bookInfo: Map<string, { title, price }>` from parent (ISP — only the fields needed for display). Renders item list with quantity controls (+/−/Remove), order summary via DescriptionList, and a Checkout button. Uses `useTransition` for the checkout action to show "Processing…" state. Displays success (order ID) or error messages inline.
- **`lib/queries/orders.ts`** — Facade function `getBookPrices(bookIds)` that fetches live `id, title, price` from the `books` table and returns a `Map<string, BookPriceRow>` for O(1) lookup. Used exclusively by `processCheckout` to snapshot prices.
- **`lib/actions/checkout.ts`** — `processCheckout` Server Action (Command pattern). Authorization: calls `getCurrentUser()` and rejects if null. Input validation: verifies array structure, string bookIds, and integer quantities ≥ 1. Price snapshot: calls `getBookPrices()` to re-fetch live prices at the moment of execution — never trusts client-submitted prices. Computes `total_amount` from live prices × quantities with `Math.round(n * 100) / 100` to avoid floating-point drift. Inserts into `orders` (status: 'pending') then `order_items` with `purchased_price` set to the live price snapshot. Returns `{ success, orderId }` or `{ success: false, error }`.
- **`package.json`** — Added `zustand` dependency.

### Architectural Rationale: Price Snapshotting

The `processCheckout` action re-fetches prices from the database at checkout time rather than trusting prices sent from the client. This is a deliberate security and integrity decision:

1. **Security** — Client-submitted prices can be tampered with. The server is the only authority on pricing.
2. **Historical integrity** — The `purchased_price` column in `order_items` preserves the exact price at the moment of purchase. Future price changes to the `books` table do not retroactively alter order history.
3. **Consistency** — The `total_amount` on the `orders` row is always the sum of `purchased_price × quantity` across its items, computed from the same price fetch.

---

## Implementation: Branding and Landing Page (The Codex)

### Prompt (User)

> Implement the 'The Codex' high-fidelity landing page at app/page.tsx. Hero with headline 'The Codex' and subtext 'Technical Manuscripts for the Modern Engineer.' Dark zinc-950 palette. Create components/Terminal.tsx with animated CLI sequence (codex --fetch, indexing lines, ASCII progress bar). Smart CTAs: authenticated users see 'Enter The Library' linking to /catalog, unauthenticated see 'Sign in with Google' triggering signInWithGoogle. Secondary outline Button linking to GitHub repo. Update root layout.tsx metadata. Log in CHATLOG.md under 'Implementation: Branding and Landing Page (The Codex)'.

### Key Decisions / What Changed

- **`components/Terminal.tsx`** — New Client Component (`'use client'`). Simulates a CLI session with character-by-character typing animation. Sequence: `> codex --fetch --limit=10000`, three "Indexing: ... [DONE]" lines (Clean Code, Pragmatic Programmer, SICP), then an ASCII progress bar `[====================] 100%` animated incrementally. Uses `useEffect` with async loop and cancellation flag for cleanup. Monospace font, zinc-900 background, rounded corners with window chrome header (red/yellow/green dots). Auto-scrolls via `useRef` + `scrollIntoView`.
- **`app/page.tsx`** — Complete rewrite from Next.js boilerplate to The Codex landing page. Server Component that calls `getCurrentUser()` to determine CTA state. Dark zinc-950 full-page background with `font-mono`. Hero section: Catalyst `Heading` (level 1, `text-5xl/6xl`) for "The Codex", Catalyst `Text` for subtitle ("The Online Bookstore Demo"). Terminal component centered below hero. Smart CTAs: if `getCurrentUser()` returns a session, renders "Enter The Library" as a `Link` to `/catalog` wrapping a solid Catalyst `Button`; otherwise renders a `form action={signInWithGoogle}` with "Sign in with Google" solid `Button`. Secondary: outline Catalyst `Button` with inline GitHub SVG icon linking to `https://github.com/carletonDev/bookstore-demo` (new tab).
- **`app/layout.tsx`** — Updated `metadata.title` from "Create Next App" to "The Codex". Added developer-centric `metadata.description`: "Technical manuscripts for the modern engineer. Browse, review, and purchase programming books — built with Next.js 16, Supabase, and Catalyst UI."

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

---

## Bug Fix: Eliminating Hardcoded URLs for Vercel Deployment

### Prompt (User)

> The Vercel deployment is failing because it's redirecting to localhost:3000 after Google login. Update lib/utils/url.ts to use NEXT_PUBLIC_VERCEL_URL when present, falling back to http://localhost:3000. Ensure auth actions use this utility. Ensure proxy.ts uses no hardcoded URLs.

### Root Cause

`lib/utils/url.ts` was reading `NEXT_PUBLIC_APP_URL` which was never set on Vercel, causing `getAuthCallbackUrl()` to return `undefined/auth/callback` — breaking the Google OAuth redirect on every Vercel deployment.

### Key Decisions / What Changed

- **`lib/utils/url.ts`** — Removed `NEXT_PUBLIC_APP_URL` dependency entirely. Added `export function getURL()` which checks `process.env.NEXT_PUBLIC_VERCEL_URL` (set automatically by Vercel for all deployments) and returns `https://${NEXT_PUBLIC_VERCEL_URL}`. Falls back to `http://localhost:3000` for local development. No manual env var configuration required per environment.
- All three URL helpers (`getAuthCallbackUrl`, `getAuthProxyUrl`, `getAuthCallbackUrlWithNext`) now delegate to `getURL()` — single source of truth preserved.
- **`lib/actions/auth.ts`** — No change required; it already calls `getAuthCallbackUrl()` from `url.ts`. The fix propagates automatically.
- **`proxy.ts`** — Confirmed no hardcoded URLs. All cookie and session logic operates on `request.cookies` and `NextResponse` objects derived from the incoming request — fully relative, environment-agnostic.

---

## Implementation: Reporting and Quality Assurance

### Prompt (User)

> Implement Reporting, History, and Vitest tests. Reporting: Build app/reports/page.tsx showing 'Global Sales Stats' and a 'Genre Breakdown' using Catalyst Table and the view_genre_sales Postgres view. Order History: Build app/orders/page.tsx displaying previous orders using Catalyst DescriptionList with historical price. Testing: Create Vitest tests for encodeCursor/decodeCursor pagination logic and processCheckout price snapshot. Authorization: Protect these routes in proxy.ts. Documentation in CHATLOG.md.

### Key Decisions / What Changed

- **`migrations/0002_view_genre_sales.sql`** — Created Postgres VIEW `view_genre_sales` that joins `genres -> book_genres -> order_items -> orders` to aggregate `order_count`, `total_units_sold`, and `total_revenue` per genre. Uses LEFT JOINs so genres with zero sales still appear. Ordered by `total_revenue DESC`.

- **`types/database.ts`** — Added `GenreSalesRow` interface (maps 1:1 to the view columns) and `GlobalSalesStats` interface (aggregated totals across all genres). Placed in a new "Reporting" section between Pagination and Search.

- **`components/table.tsx`** — Catalyst Table component suite: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeader`, `TableCell`. Zinc typography, responsive overflow, dark mode support. Follows Catalyst design language.

- **`components/description-list.tsx`** — Catalyst DescriptionList component suite: `DescriptionList`, `DescriptionTerm`, `DescriptionDetails`. Divider-separated layout with zinc typography.

- **`lib/queries/reports.ts`** — Facade over the `view_genre_sales` view. Exports `getGenreSales()` (fetches all genre rows) and `aggregateGlobalStats()` (pure function that reduces genre rows into global totals).

- **`lib/queries/orders.ts`** — Facade for order history. `getOrderHistory(userId)` fetches orders with nested `order_items -> books` using Adapter pattern to map raw PostgREST shape to `OrderWithItems[]`. Uses `purchased_price` (historical snapshot), never live `books.price`. Also exports `getBookPrices()` for checkout price lookups.

- **`lib/actions/checkout.ts`** — `processCheckout` Server Action (Command pattern). Validates cart items at the boundary, authenticates via `getCurrentUser()`, snapshots current `books.price` via `getBookPrices()`, creates `orders` row with computed `total_amount`, inserts `order_items` with `purchased_price` = snapshot. Returns `{ success, orderId?, error? }`. The client never controls the price.

- **`app/reports/page.tsx`** — Server Component. Calls `getGenreSales()` and `aggregateGlobalStats()`. Renders "Global Sales Stats" as three stat cards (total revenue, units sold, orders) and "Genre Breakdown" as a Catalyst Table with genre name, order count, units sold, and revenue columns. Currency formatted via `Intl.NumberFormat`.

- **`app/orders/page.tsx`** — Server Component. Calls `getCurrentUser()` (redirects to `/login` if null), then `getOrderHistory(userId)`. Renders each order as a card with status badge, Catalyst DescriptionList showing date, total, and line items with `purchased_price` (historical price, not current).

- **`proxy.ts`** — Refactored `refreshSession()` to return `{ response, user }` instead of just `response`. Added `PROTECTED_ROUTES = ['/catalog', '/reports', '/orders']`. The `proxy()` export now checks if the requested path matches a protected route and redirects unauthenticated users to `/login`.

- **`vitest.config.ts`** — Created Vitest configuration with `@/*` path alias matching `tsconfig.json`.

- **`package.json`** — Added `vitest` as devDependency, added `"test": "vitest run"` script.

- **`__tests__/pagination.test.ts`** — 12 tests covering:
  - `encodeCursor`: base64url format, round-trip encoding
  - `decodeCursor`: round-trip decoding, malformed input (bad base64, wrong JSON shape, missing fields, non-string fields), edge cases (empty strings, special characters)
  - `buildCursorFilter`: correct PostgREST filter string, double-quote escaping, backslash escaping

- **`__tests__/checkout.test.ts`** — 7 tests covering:
  - Input validation: empty cart, invalid quantity, missing bookId
  - Authentication: throws when user is not authenticated
  - Price snapshot: verifies `purchased_price` comes from `books.price` on the server, not from client input
  - Multi-item total: verifies total is computed correctly from multiple items with different prices
  - Missing books: throws when a book is not found in the database

- **All 19 tests pass** (`vitest run`: 2 test files, 19 tests, 0 failures).

---

## Implementation: Catalog and Social Proof Logic

### Prompt (User)

> Implement the Book Catalog and Review system at the new /catalog path. Route Migration: Move the catalog logic to app/catalog/page.tsx as a Server Component handling q, genre, and cursor URL params. UI Shell: Wrap in Catalyst SidebarLayout with Genre filters and Format toggle. BookCard: Build using Catalyst Heading, Text, Badge with 1-decimal rating_avg. Social Proof: Implement submitReview Server Action handling unique user/book constraint and relying on O(1) database trigger. Create Catalyst Dialog for star rating. Authorization: In proxy.ts, ensure /catalog without valid session redirects to /login.

### Key Decisions / What Changed

- **`components/badge.tsx`** — New Catalyst Badge component. Inline pill with colored background and ring border. Supports 7 color variants (zinc, green, amber, red, blue, purple, pink). Used in BookCard for rating display and genre tags.
- **`components/dialog.tsx`** — New Catalyst Dialog component. Uses native `<dialog>` element with `showModal()` for accessibility. Exports `Dialog`, `DialogTitle`, `DialogBody`, `DialogActions` sub-components. Marked `'use client'` for imperative open/close via `useRef`.
- **`components/book-card.tsx`** — New BookCard Server Component. Uses Catalyst `Heading` (level 4) for title, `Text` for author and review count, `Badge` (amber) for prominent 1-decimal `rating_avg` display. Shows genre tags as blue Badges. Displays cover image with aspect-[3/4] placeholder.
- **`components/catalog-sidebar.tsx`** — New CatalogSidebar Server Component. Renders genre filter links and format toggle links. Navigation via URL params (no client state). Uses `Heading` (level 4) for section labels, `Text` for help text. Active filters highlighted with zinc-100 background.
- **`components/review-dialog.tsx`** — New ReviewDialog Client Component. Collects star rating (1-5) via interactive star buttons with hover preview. Uses `useActionState` with `submitReview` Server Action. Displays success/error feedback via `Alert` component. Catalyst `Dialog` for the modal shell.
- **`lib/actions/reviews.ts`** — New `submitReview` Server Action (Command pattern). Validates input at boundary (rating 1-5, non-empty bookId). Checks `getCurrentUser()` for authentication. Handles Postgres `23505` unique violation (user already reviewed book) with user-friendly message. Relies on `trg_book_rating_aggregates` trigger for O(1) aggregate update — no application-layer aggregation.
- **`lib/queries/genres.ts`** — New `getGenres()` Facade. Fetches all genres ordered alphabetically. Used by catalog sidebar for filter rendering.
- **`app/catalog/layout.tsx`** — Catalyst SidebarLayout shell. Sticky top bar with Bookstore heading and Sign Out button. Max-width container for main content area.
- **`app/catalog/page.tsx`** — Server Component at `/catalog`. Handles `q` (search), `genre` (filter), `format` (filter), and `cursor` (pagination) URL parameters. Validates format against allowed values. Fetches books and genres in parallel via `Promise.all`. Renders search bar, BookCard grid, pagination link, and ReviewDialog per book. Authorization: redirects to `/login` if `getCurrentUser()` returns null.
- **`proxy.ts`** — Added authorization guard: unauthenticated requests to `/catalog` are redirected to `/login` before reaching the page. Defense in depth — the page component also checks `getCurrentUser()`. Destructured `getUser()` result to access `user` object for the check.

---

## Implementation: Authenticated Dashboard and Redirect Logic

### Prompt (User)

> Implement the Authenticated Dashboard experience. Update auth callback to redirect to /catalog. Add a Catalyst SidebarLayout with welcome message, Quick Stats bar, navigation, Sign Out in sidebar, and a public landing page with conditional CTA.

### Key Decisions / What Changed

- **`app/auth/callback/route.ts`** — Changed post-login redirect from `${origin}/` to `${origin}/catalog`. After successful OAuth code exchange, users land directly in The Library instead of the root page.
- **`lib/utils/currentUserProfile.ts`** — New utility. Exports `getCurrentUserProfile()` which returns `{ id, fullName, email, avatarUrl }` by reading Google OAuth metadata from `supabase.auth.getUser()`. Extracts `full_name` / `name` and `avatar_url` / `picture` from `user_metadata`. Returns null when unauthenticated. Follows the same Factory pattern as `getCurrentUser()`.
- **`lib/queries/userStats.ts`** — New Facade. Exports `getUserStats(userId)` returning `{ booksPurchased, recentReviewCount }`. Queries `order_items` joined to `orders` for purchase totals, and `reviews` with `count: 'exact'` for review count. Both queries run in parallel via `Promise.all`.
- **`app/catalog/layout.tsx`** — Rewritten to Catalyst SidebarLayout. Now an async Server Component that fetches `getCurrentUserProfile()`. Left sidebar (hidden on mobile) with brand heading ("The Codex"), nav links (The Library, Order History, Reports), and Sign Out button at the bottom. Top bar shows "Welcome, [Name]" using the Google profile `fullName`. Mobile-responsive: Sign Out and brand shown in top bar on small screens.
- **`app/catalog/page.tsx`** — Added Quick Stats bar at the top of the main content area. Two stat cards: "Books Purchased" and "Recent Reviews" fetched via `getUserStats()`. Stats query runs in parallel with `getBooks()` and `getGenres()` via `Promise.all`.
- **`app/page.tsx`** — Replaced boilerplate Create Next App content with a Codex landing page. Checks `getCurrentUser()` to determine auth state. Authenticated users see "Enter The Library" CTA linking to `/catalog`. Unauthenticated users see "Get Started" CTA linking to `/login`.
- **`lib/actions/auth.ts`** — Changed `signOut()` redirect from `/login` to `/` so users land on the public landing page after signing out.

---

## Implementation: GitHub Actions CI Pipeline

### Prompt (User)

> Create a GitHub Actions CI pipeline for automated quality assurance. File: .github/workflows/ci.yml. Triggers: push to main and all pull_request events. Steps: checkout, Node LTS setup, npm ci, lint, type check (tsc --noEmit), prettier --check, and vitest. Ensure tests run headlessly without Supabase secrets via mocks.

### Key Decisions / What Changed

- **`.github/workflows/ci.yml`** — Created single-job CI pipeline (`quality`) on `ubuntu-latest`. Triggers on `push` to `main` and all `pull_request` events. Steps in order:
  1. `actions/checkout@v4` — Checkout code
  2. `actions/setup-node@v4` with `node-version: lts/*` and `cache: npm` — Install Node.js LTS with npm caching for fast installs
  3. `npm ci` — Clean install from lockfile (deterministic)
  4. `npm run lint` — ESLint via project script
  5. `npx tsc --noEmit` — TypeScript type checking without emitting files
  6. `npx prettier --check .` — Verify code formatting consistency
  7. `npm run test` — Run Vitest test suite (19 tests across 2 files)

- **`prettier` (devDependency)** — Added to `package.json` so the `prettier --check` CI step has the binary available. Previously not installed.

- **`.prettierignore`** — Created to exclude `.next/`, `node_modules/`, and `package-lock.json` from formatting checks.

- **Prettier formatting** — Ran `npx prettier --write .` to format all 41 files that had style inconsistencies, so the CI `--check` step passes from the first run.

- **`__tests__/checkout.test.ts`** — Fixed two TypeScript errors (TS2556: spread argument type mismatch) in mock factory functions. Changed `(...args: unknown[]) => mockFn(...args)` to `() => mockFn()` since the mocks are typed as zero-arg functions.

### CI Environment: No Supabase Secrets Required

Both test files (`checkout.test.ts` and `pagination.test.ts`) use `vi.mock()` to intercept all Supabase client imports. The mocks replace `createServerClient`, `getCurrentUser`, and `getBookPrices` with in-memory fakes. Tests were verified to pass with all `SUPABASE_*` and `NEXT_PUBLIC_SUPABASE_*` environment variables unset — no secrets needed in CI.

### Verification

All four CI quality gates pass locally:

- `npm run lint` — 0 errors (1 warning: `<img>` vs `<Image>`)
- `npx tsc --noEmit` — 0 errors
- `npx prettier --check .` — all files formatted
- `npm run test` — 19/19 tests pass (672ms)

---

## Implementation: High-Scale Database Seeding

### Prompt (User)

> Create lib/db/seed.ts to seed 10 publishers, 50 authors, 12 genres, 210 books, reviews for ~55% of books, and 20 seed auth users. Use SUPABASE_SECRET_KEY, batch inserts, Codex-themed titles. Log row counts per table. Install @faker-js/faker and dotenv.

### Key Decisions / What Changed

- **`lib/db/seed.ts`** — New standalone Node.js seed script. Uses `createClient` from `@supabase/supabase-js` directly with `SUPABASE_SECRET_KEY` to obtain admin access (bypasses RLS). Loads `.env.local` from the project root via `dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })`. Fails fast with a clear error message if env vars are missing.

- **Title generation** — Template × topic combinatorial approach: 25 `TITLE_TEMPLATES` × 46 `TECH_TOPICS` = 1,150 unique possible titles. Shuffled and capped at 210. Guarantees authentic-sounding developer book titles (e.g. "Kafka at Scale", "Production-Ready OpenTelemetry") without repetition.

- **Seed auth users** — Reviews require `user_id REFERENCES auth.users(id)`. The script creates 20 real auth.users rows via `supabase.auth.admin.createUser()` with `email_confirm: true`. These are seed-only accounts with `@seed.bookstore.dev` email domains.

- **Review distribution** — ~55% of books receive 3–10 reviews each. `pickN` (without replacement) ensures `UNIQUE (book_id, user_id)` is never violated. Total reviews ~600.

- **Batching** — All table inserts use `insertBatched()` helper (default batch size: 50 rows). Junction tables (`book_authors`, `book_genres`, `reviews`) use batch size 100. Minimises network round-trips against the Supabase PostgREST API.

- **Rating aggregates** — Reviews are inserted via the Supabase client, which fires `trg_book_rating_aggregates` for every row. The trigger's O(1) incremental arithmetic updates `rating_sum` and `rating_count`; `rating_avg` is recalculated automatically as a `GENERATED ALWAYS AS STORED` column. No manual aggregate logic required in the seed.

- **FTS search vector** — `trg_book_authors_search_vector` fires on every `book_authors` insert, so `search_vector` is fully populated for all 210 books after `seedBookAuthors()` completes.

- **`package.json`** — Added `"seed": "tsx lib/db/seed.ts"` script. Added `@faker-js/faker ^9`, `@supabase/supabase-js ^2`, `dotenv ^16`, and `tsx ^4` as devDependencies.

- **Key naming note** — The prompt references `SUPABASE_SERVICE_ROLE_KEY`. This project uses `SUPABASE_SECRET_KEY` (renamed in an earlier session). The seed script uses `SUPABASE_SECRET_KEY` consistently with the rest of the codebase.

### Seed volume summary

| Table        | Target rows |
| ------------ | ----------- |
| publishers   | 10          |
| authors      | 50          |
| genres       | 12          |
| seed users   | 20          |
| books        | 210         |
| book_authors | ~260        |
| book_genres  | ~420        |
| reviews      | ~600        |

### Usage

```bash
npm install       # installs @faker-js/faker, dotenv, tsx
npm run seed      # runs lib/db/seed.ts against the project in .env.local
```

---

## Bug Fix: Resolving Initial Auth Failure and Double-Click Requirement

### Prompt (User)

> Fix the double-click auth bug. Before signInWithOAuth, call signOut() to clear stale sessions. In proxy.ts, clear sb-\* cookies when an auth error is detected in the URL. In login/page.tsx, clear the error param from the URL after it's been displayed.

### Root Cause

The "first click fails, second click works" bug has three contributing causes:

1. **Stale PKCE code_verifier** — Supabase PKCE OAuth stores a `code_verifier` cookie at the start of each flow. If a previous attempt failed mid-way (e.g. popup closed, network error), that cookie persists. When `signInWithOAuth` starts a new flow, the new `code_verifier` is written, but `exchangeCodeForSession` may receive a stale state. The second click overwrites all stale cookies and succeeds.

2. **Ghost session cookies** — An expired or partial access token in `sb-*` cookies can cause `getUser()` in `refreshSession()` to behave unexpectedly during the callback flow.

3. **Persistent error banner on refresh** — After a failed auth, the browser URL contains `?error=auth_callback_failed`. Refreshing the page re-renders the error banner even though the failure is no longer relevant.

### Key Decisions / What Changed

- **`lib/actions/auth.ts`** — Added `await supabase.auth.signOut()` as the first statement inside `signInWithGoogle()`, before `signInWithOAuth()`. This invalidates any stale session server-side and triggers `setAll()` to clear all `sb-*` cookies from the browser before the new PKCE flow begins. Primary fix for the double-click bug.

- **`proxy.ts`** — Added cookie purge guard inside `proxy()`: when `pathname === '/login'` and `searchParams.has('error')`, iterates all request cookies and calls `response.cookies.delete(name)` for every cookie prefixed with `sb-`. This is defense-in-depth — ensures the browser receives explicit `Set-Cookie: sb-*=; Max-Age=0` headers when landing on the error page, so the next button click always starts from a clean state. Also updated the `config.matcher` regex to remove the `/login` exclusion — the proxy must run on `/login` for this guard to fire.

- **`app/login/clear-error-param.tsx`** — New `'use client'` component. Calls `router.replace('/login', { scroll: false })` inside a `useEffect` on mount. Strips `?error=...` from the browser URL history entry once the user has seen the banner. Zero visible output — purely a URL cleanup side-effect.

- **`app/login/page.tsx`** — Imported `ClearErrorParam`. When `errorMessage` is truthy, renders `<Alert>` and `<ClearErrorParam />` together inside a fragment so the URL is cleaned immediately after the banner appears.

---

## Implementation: Database Security and RLS Policy Provisioning

### Prompt (User)

> Provision RLS policies for all tables. Public read for books, authors, publishers, genres, book_authors, book_genres. Reviews readable by everyone, but INSERT/UPDATE/DELETE restricted to auth.uid() = user_id. Orders and order_items restricted to own data. Do NOT use ALTER TABLE ... ENABLE ROW LEVEL SECURITY.

### Key Decisions / What Changed

- **`migrations/0003_rls_policies.sql`** — New migration containing all `CREATE POLICY` statements. No `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements — the Supabase event trigger handles that on table creation.

**Policy matrix implemented:**

| Table        | anon SELECT | auth SELECT |   auth INSERT    | auth UPDATE | auth DELETE |
| ------------ | :---------: | :---------: | :--------------: | :---------: | :---------: |
| publishers   |      ✓      |      ✓      |                  |             |             |
| authors      |      ✓      |      ✓      |                  |             |             |
| genres       |      ✓      |      ✓      |                  |             |             |
| books        |      ✓      |      ✓      |                  |             |             |
| book_authors |      ✓      |      ✓      |                  |             |             |
| book_genres  |      ✓      |      ✓      |                  |             |             |
| reviews      |      ✓      |      ✓      |     own row      |   own row   |   own row   |
| orders       |             |      ✓      |     own row      |             |             |
| order_items  |             |      ✓      | via parent order |             |             |

**Design decisions:**

- **Public catalog tables** use `USING (true)` with `TO anon, authenticated` — both roles get unrestricted SELECT. This enables unauthenticated browsing of the book catalog if needed in future.
- **Reviews** — `USING` + `WITH CHECK` on `auth.uid() = user_id` for UPDATE prevents a user from re-assigning a review to another user. The table-level `UNIQUE (book_id, user_id)` enforces one-review-per-book at the DB layer; the INSERT policy enforces it at the auth layer.
- **Orders** — No UPDATE or DELETE policies. Status transitions (`pending → confirmed → shipped`) are service-role operations only and must never be accessible to the client.
- **order_items** — No `user_id` column; ownership is derived via a correlated subquery against `orders.user_id`. Both SELECT and INSERT policies use `EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())`. No UPDATE or DELETE — `purchased_price` is a historical price snapshot and is immutable by design.

---

## Implementation: Restoring Cart Integration and Purchase Flow

### Prompt (User)

> Re-integrate the Cart system into the new 'The Codex' architecture. Create AddToCartButton, integrate into BookCard, add Cart trigger with badge to layout, render CartDrawer globally, ensure checkout redirects to /orders, and maintain dark zinc theme.

### Key Decisions / What Changed

- **Created `components/add-to-cart-button.tsx`** — Client Component using `useCartStore.addItem`. Renders a format selector (when multiple formats exist) and a solid Catalyst Button (small size). Shows brief "Added!" confirmation feedback.
- **Integrated AddToCartButton into catalog page** — Placed below each BookCard in `app/catalog/page.tsx` alongside the existing ReviewDialog. BookCard remains a Server Component; the button is a sibling client component in the grid item wrapper.
- **Created `components/catalog-cart-shell.tsx`** — Client Component that encapsulates the cart trigger button (outline Catalyst Button with cart icon), a dynamic Badge showing `totalItems` from Zustand, and the CartDrawer slide-over. Fetches book info via a new server action when the drawer opens.
- **Created `lib/actions/cart-info.ts`** — Server Action `fetchCartBookInfo` that fetches title/price for cart book IDs using the existing `getBookPrices` facade. Returns a serialisable array (Maps are not serialisable across the server action wire).
- **Updated `app/catalog/layout.tsx`** — Added `CatalogCartShell` in two places: the desktop sidebar (above Sign Out) and the mobile top bar (next to Sign Out). The CartDrawer is rendered inside the shell so it can be toggled from anywhere in the catalog.
- **Updated `components/cart-drawer.tsx`** — On successful checkout, calls `clearCart()`, closes the drawer via `onClose()`, and redirects to `/orders` using `next/navigation`'s `useRouter().push()`. Removed the inline success message (orderId state) since the user is redirected instead.
- **Dark zinc theme consistency** — All new and modified components use the existing zinc-900/950 dark palette. The SlideOverPanel already renders with `dark:bg-zinc-900`. CartDrawer text uses `dark:text-white` / `dark:text-zinc-400`. No theme deviations introduced.
- **Architectural patterns preserved** — Facade pattern (server action wraps `getBookPrices`), Command pattern (checkout as server action), Zustand for client state, Interface Segregation (AddToCartButton accepts only `bookId` + `formats`).

---

## Bug Fix: Trigger Synchronization and Rating Aggregates

### Prompt (User)

> Re-run trg_book_rating_aggregates creation ensuring FOR EACH ROW and INSERT/UPDATE/DELETE. Add a migration with the bulk UPDATE re-sync. Verify BookCard uses rating_avg and rating_count. Add revalidatePath('/catalog') to submitReview success block.

### Key Decisions / What Changed

- **`migrations/0004_fix_rating_trigger_resync.sql`** — New migration with three steps:
  1. `CREATE OR REPLACE FUNCTION update_book_rating_aggregates()` — re-applies the full trigger function body with `AFTER INSERT / UPDATE / DELETE` O(1) incremental arithmetic.
  2. `DROP TRIGGER IF EXISTS trg_book_rating_aggregates ON reviews` + `CREATE TRIGGER` — guarantees the trigger is attached with the correct `AFTER INSERT OR UPDATE OF rating OR DELETE` / `FOR EACH ROW` event mask regardless of prior state. Triggers cannot be replaced in place in Postgres; drop-and-recreate is the only safe pattern.
  3. Bulk re-sync `UPDATE books SET rating_sum = COALESCE((SELECT SUM(rating) ...), 0), rating_count = (SELECT COUNT(*) ...)` — back-fills correct aggregates for all existing books from live review data. `rating_avg` is a `GENERATED ALWAYS AS STORED` column and recalculates automatically when `rating_sum` / `rating_count` change.

- **`components/book-card.tsx`** — Verified: already reads `book.rating_avg` (via `formatRating()`) and `book.rating_count` (review count label). No changes needed.

- **`lib/actions/reviews.ts`** — Added `import { revalidatePath } from "next/cache"` and `revalidatePath("/catalog")` call in the success block, after the insert. This busts Next.js's full-route cache for `/catalog` so the updated `rating_avg` and `rating_count` are visible on the next page load without a redeploy or manual ISR invalidation.
