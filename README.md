# Bookstore Demo

A full-stack bookstore application built with Next.js 16 (App Router), Supabase (Postgres), Tailwind Catalyst UI, and Vitest.

---

## 1. Setup Instructions

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is sufficient)
- `npm` or `pnpm`

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database setup

Run the DDL migrations in the Supabase SQL editor in this order:

1. `publishers`, `authors`, `genres`
2. `books` (depends on `publishers`)
3. `book_authors`, `book_genres` (join tables)
4. `reviews` + rating aggregate trigger
5. `orders`, `order_items`

The Supabase instance uses a custom event trigger to provision Row Level Security automatically on table creation. No manual `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements are required.

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run tests

```bash
npm run test
```

---

## 2. Architectural Decisions

### Auth: Separated OAuth Callback and Session Proxy

The authentication layer uses a narrow Route Handler for identity exchange and a root-level utility module for session maintenance, instead of a single `middleware.ts`:

- **`/auth/callback`** (`app/auth/callback/route.ts`) — **Identity Exchange.** Handles the Google OAuth code-for-session swap. Runs exactly once per sign-in. After `exchangeCodeForSession()` succeeds, session cookies are written and the user is redirected to the home page. Intentionally narrow and easy to audit.

- **`proxy.ts`** (repository root) — **Session Proxy.** A plain TypeScript module exporting `refreshSession(request)`. Any Route Handler that needs a guaranteed-fresh session imports and calls it inline — no extra HTTP round-trip, no dedicated endpoint. It creates a Supabase client that reads cookies from the `NextRequest` and writes refreshed tokens to both the request (for the current render) and the response (for the browser).

**Why not `middleware.ts`?** Next.js middleware runs on the Edge Runtime, which lacks the Node.js APIs that `@supabase/ssr`'s cookie management requires. The `setAll()` callback silently fails in the Edge Runtime, dropping cookie writes. This pattern runs in the Node.js runtime, has guaranteed cookie write-back, and replaces the legacy middleware auth pattern that was common in earlier Next.js/Supabase versions.

### Row Level Security via Supabase Trigger

Rather than hand-authoring `CREATE POLICY` statements for every table, this project relies on a custom Supabase database trigger that automatically provisions RLS rules when a new table is created. This keeps DDL migrations lean and eliminates a class of copy-paste policy errors.

### Next.js 16 Server Components

Catalog, book detail, and order history pages are React Server Components. Data fetching happens on the server, co-located with the Supabase client, eliminating client-side waterfalls and reducing bundle size. Only interactive islands (cart state, search input, checkout form, star ratings) are Client Components. Next.js 16's enhanced Server Component streaming gives a fast time-to-first-byte on the catalog page.

### Cursor-Based Pagination

The book catalog uses keyset (cursor-based) pagination instead of `OFFSET/LIMIT`. At ~10,000 books, deep offset queries force Postgres to scan and discard thousands of rows. Cursor pagination resolves in constant time regardless of position in the dataset, using a composite `(title, id)` index as the sort key.

### Denormalized Review Aggregates (Trigger-Maintained)

`rating_avg`, `rating_sum`, and `rating_count` are stored directly on the `books` table and maintained by a Postgres trigger (`AFTER INSERT OR UPDATE OR DELETE ON reviews`). The catalog page reads a pre-computed value — no live aggregation on every request.

### Book Formats as TEXT[]

All formats (Hardcover, Softcover, Audiobook, E-reader) share one price, so a `TEXT[]` column with a `CHECK` constraint and a GIN index is used instead of a normalized join table. Migrates cleanly to a `book_formats` table if per-format pricing is required later.

### Unified Full-Text Search

A `tsvector` column on `books` (populated from title + joined author names via trigger) with a GIN index supports the single search input that matches both titles and author names. Supabase's PostgREST exposes this via `.textSearch()`.

### User Selection via Combobox + Cookie

With 1,000 users, a standard `<select>` is unusable. A Catalyst `Combobox` (Headless UI-backed, type-to-filter) is used for the Current User picker. The selected `user_id` is persisted in a cookie (`SameSite: Lax`, `Path: /`, 7-day expiry) so it survives page refreshes and is readable by Server Components via `cookies()` from `next/headers` without prop-drilling.

---

## 3. AI Output I Intentionally Changed

### Session Management: Route Handler → Custom proxy.ts

The AI repeatedly attempted to use standard Next.js Route Handlers for session management. I intervened to force a custom `proxy.ts` pattern. I did this to ensure session logic remained decoupled and could be easily integrated into our specific Next.js 16 deployment strategy, which avoided the limitations of the standard Edge-based middleware.

---

### Review Aggregates: On-the-Fly VIEW → Denormalized Trigger

**Original AI output:** A `review_aggregates` VIEW that computed `AVG(rating)` per book on every query.

**The problem:** A VIEW re-runs the aggregation on every catalog render — an unnecessary full-scan at scale.

**My correction:** Moved aggregates to denormalized columns (`rating_avg`, `rating_count`) on `books`, maintained by a Postgres trigger. Write-time cost is paid once; every catalog read is free.

---

### Review Trigger: Re-aggregating Query → Incremental Arithmetic

**Original AI output:** The trigger called `SELECT AVG(rating)` and `SELECT COUNT(*)` over all reviews for the affected book on every write.

**The problem:** Still a full per-book aggregate scan on every write. A book with 10,000 reviews causes 10,000 rows to be read just to increment a counter by one.

**My correction:** Added a `rating_sum` column and rewrote the trigger to use incremental arithmetic:

- `INSERT`: `rating_sum += NEW.rating`, `rating_count += 1`
- `DELETE`: `rating_sum -= OLD.rating`, `rating_count -= 1`
- `UPDATE`: `rating_sum += (NEW.rating - OLD.rating)`, count unchanged
- `rating_avg` is a `GENERATED ALWAYS AS (rating_sum::NUMERIC / NULLIF(rating_count, 0)) STORED` computed column — division by zero handled at the schema level

Each write is now O(1) regardless of review volume.

---

## 4. Two Additional Features I Chose

### Optimistic UI for Star Ratings

When a user clicks a star, the UI updates immediately using React's `useOptimistic` hook — before the Supabase Server Action completes. If the write fails, the rating rolls back to its previous value. This eliminates perceived latency on the most frequent interactive action in the app.

### Stale-While-Revalidate Search via useTransition

The unified search input wraps its fetch in `useTransition`. While `isPending` is true, a subtle loading indicator appears and the previous results remain visible — no blank state, no layout shift. The experience feels instant for recently-seen queries, matching the behavior of a dedicated search-as-you-type library without adding a dependency.

---

## 5. Assumptions & Tradeoffs Due to Timebox

| Area | Assumption / Tradeoff |
|---|---|
| Authentication | Google OAuth via Supabase is implemented. The `proxy.ts` session pattern replaces the earlier cookie-based user selector. Production hardening (rate limiting, refresh token rotation policy) is out of scope. |
| Formats pricing | All formats share one price. A `TEXT[]` column is used; per-format pricing would require a schema migration. |
| Search relevance | `plainto_tsquery` with `ts_rank` is used. More sophisticated ranking (BM25, semantic search via pgvector) is out of scope. |
| Image storage | `cover_image_url` stores a URL string. Supabase Storage bucket setup and upload flow are not implemented. |
| Order fulfillment | Order status transitions (confirmed → shipped → delivered) have no backend workflow. The `order_status` enum is in place for future use. |
| Test coverage | Vitest unit tests cover business logic (cursor encoding, price calculations). Integration and E2E tests are not in scope. |
| Seed data | No seed script is provided. The 10,000-book catalog and 1,000-user assumptions are architectural, not implemented. |

---

## 6. Reflection: AI Usage

### What did AI significantly accelerate?

**Boilerplate and schema drafting.** The initial DDL for seven tables, all indexes, TypeScript interfaces, and the trigger skeleton were generated in a single prompt. This eliminated 2–3 hours of rote typing and cross-referencing Postgres docs. The AI correctly identified the need for a composite cursor index, a `UNIQUE (book_id, user_id)` constraint on reviews, and the `purchased_price` snapshot pattern on `order_items` without being prompted for those specifics.

**Decision framing.** Asking the AI to evaluate TEXT[] vs. JSONB vs. a join table for formats produced a concise tradeoff table that would have taken research and deliberation to produce independently. It got the recommendation right for the stated constraints.

**Documentation structure.** First drafts of `CHATLOG.md` and `README.md` sections were generated and required only targeted edits, not rewrites.

---

### Where did AI make things worse?

**The aggregate trigger was subtly wrong — twice.** The first output proposed a live VIEW, which was a performance anti-pattern. After correction, the trigger still issued a full `SELECT AVG()` scan on every write — a less obvious but equally real problem. A junior engineer following the AI output without review would have shipped an O(n) write path that degrades silently as review volume grows. The AI's default is "correct and readable," not "correct and performant at scale."

**No sense of operational context.** The AI had no awareness that the Supabase instance uses a custom RLS trigger until explicitly told. Left unconstrained, it would have generated `CREATE POLICY` boilerplate that either duplicated or conflicted with the existing automation.

---

### What risks does AI introduce into engineering workflows?

**Confident incorrectness at the wrong layer.** AI errors tend to appear in non-obvious places — not syntax errors the compiler catches, but semantic errors like an inefficient trigger or a missing `NULLIF`. These pass code review if reviewers trust AI output without running `EXPLAIN ANALYZE`.

**Skill atrophy on fundamentals.** If engineers stop writing DDL and trigger logic from scratch, they lose the fluency needed to recognize when generated output is subtly wrong. The correction in this project (re-aggregating vs. incremental arithmetic) required knowing enough Postgres internals to ask the right question. That knowledge doesn't come from prompting.

**Scope creep by suggestion.** AI readily suggests additions — extra indexes, optional columns, helper utilities — that are not strictly necessary. Without discipline, an AI-assisted codebase accumulates speculative complexity faster than a human-authored one.

**Audit and ownership gaps.** When a bug is traced back to AI-generated code that was accepted without deep review, ownership is ambiguous. Teams need explicit conventions (like this CHATLOG) that record what was generated, what was changed, and why — so that decisions are attributable and revisable.
