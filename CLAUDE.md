# Claude Code Instructions

## CHATLOG.md — Required on Every Prompt

**You must update `CHATLOG.md` at the end of every response that makes a meaningful change or decision.**

### Format

Add a new session block if one does not already exist for today's date. Append new prompts within the current session block. Use this structure:

```markdown
## Session N — YYYY-MM-DD

### Prompt (User)

> Paste or summarize the user's prompt verbatim.

### Key Decisions / What Changed

- Bullet summary of decisions made, files changed, or architectural choices recorded.
```

### Rules

- **Every prompt gets logged** — feature requests, corrections, constraint additions, and documentation changes all qualify.
- **Corrections go in both places** — if the user corrects AI output, add the entry to the session block AND to the `## AI Output I Intentionally Changed` section at the bottom of `CHATLOG.md`.
- **Be specific** — name the files changed, the pattern chosen, and the reason. Vague entries like "updated the code" are not acceptable.
- **Do not rewrite history** — append only. Never edit or delete a previous session block.
- **Session numbering** — increment the session number globally across dates, not per day.

### What counts as a meaningful change

- Any new architectural or data modeling decision
- Any constraint added by the user
- Any correction to previously generated output
- Any new feature added to the plan or implementation
- Any file created or substantially rewritten

---

## Coding Standards

### SOLID Principles

Apply SOLID principles to all TypeScript, React, and server-side code:

- **Single Responsibility** — Every module, function, component, and Server Action does one thing. A component that fetches data, transforms it, and renders UI must be split. Data-fetching belongs in a dedicated query function; transformation in a pure utility; rendering in the component.
- **Open/Closed** — Extend behavior through composition and props, not by modifying existing modules. Add new book filter strategies by composing a new filter function, not by adding another `if` branch to an existing one.
- **Liskov Substitution** — Subtypes must be substitutable for their base types. If a function accepts a `Book`, it must work correctly with any object that satisfies the `Book` interface without special-casing.
- **Interface Segregation** — Keep TypeScript interfaces narrow. Prefer `Pick<Book, 'id' | 'title' | 'price'>` in component props over passing the full `Book` object when only three fields are used.
- **Dependency Inversion** — Depend on abstractions, not concretions. Supabase client instances must be injected or imported from a single factory (`lib/supabase/server.ts`, `lib/supabase/client.ts`), never instantiated inline in components or actions.

### DRY (Don't Repeat Yourself)

- Extract any logic used in more than one place into a shared utility, hook, or query function before the second use is committed.
- Shared query builders live in `lib/queries/`. Shared type guards and formatters live in `lib/utils/`. Reusable React logic lives in `hooks/`.
- Do not duplicate Supabase query fragments. If the same `.select()` shape is used in two places, extract it to a named constant.
- Exception: duplication is acceptable when the two instances are likely to diverge. Do not prematurely abstract code that merely looks similar.

### Design Patterns

Apply the following patterns where they provide clear value. Do not introduce a pattern just to tick a box.

**Creational**
- **Factory Function** — Use factory functions (`createSupabaseServerClient()`, `createSupabaseClientClient()`) to encapsulate Supabase client instantiation. Never use `new` inline.
- **Builder** (query builder pattern) — Compose Supabase query chains incrementally when filter/sort/pagination options are dynamic, rather than branching on every combination.

**Structural**
- **Adapter** — Wrap Supabase response shapes in adapter functions that map database row types (`Book` from `database.ts`) to view-model types consumed by components. Database schema changes should not require editing component files.
- **Decorator** (HOC / wrapper pattern) — Use React component wrappers for cross-cutting concerns such as authentication guards or Suspense boundaries, rather than embedding that logic in every page.
- **Facade** — Expose a clean, domain-oriented API from `lib/` (e.g., `getBookCatalog()`, `submitReview()`) that hides Supabase query details from page components and Server Actions.

**Behavioral**
- **Strategy** — Encapsulate interchangeable algorithms (sort strategies, search strategies, pagination strategies) as functions passed as parameters, rather than hard-coding behavior with conditionals.
- **Observer** (via React state / Supabase Realtime) — Use Supabase Realtime subscriptions for live data when appropriate; encapsulate subscription setup and teardown in a dedicated custom hook.
- **Command** (via Server Actions) — Treat each Server Action as a discrete command with a single responsibility. Name them imperatively: `submitReview`, `placeOrder`, `setCurrentUser`.

### General Rules

- No `any` types. Use `unknown` and narrow explicitly, or define a proper interface.
- All Server Actions validate input at the boundary before touching the database.
- Pure functions (no side effects) for all data transformation and cursor encoding/decoding utilities.
- Prefer explicit `return` types on all exported functions.
