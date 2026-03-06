/**
 * Cursor encoding/decoding for keyset (cursor-based) pagination.
 *
 * The cursor encodes the last row's (title, id) tuple so the next query can
 * apply: WHERE (title > cursorTitle) OR (title = cursorTitle AND id > cursorId)
 *
 * This simulates Postgres row comparison: WHERE (title, id) > (cursorTitle, cursorId)
 * which the composite index idx_books_cursor (title ASC, id ASC) resolves in O(log n).
 *
 * Encoding: base64url JSON — URL-safe, no padding issues in query strings.
 *
 * All functions are pure (no side effects) per CLAUDE.md coding standards.
 */

export interface DecodedCursor {
  title: string;
  id: string;
}

/**
 * Encodes a (title, id) pair into an opaque base64url cursor string.
 * Pure function — no side effects.
 */
export function encodeCursor(title: string, id: string): string {
  return Buffer.from(JSON.stringify({ title, id })).toString("base64url");
}

/**
 * Decodes a base64url cursor string back into a (title, id) pair.
 * Throws a descriptive error on malformed input — never returns a partial cursor.
 * Pure function — no side effects.
 */
export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).title !== "string" ||
      typeof (parsed as Record<string, unknown>).id !== "string"
    ) {
      throw new Error("Invalid cursor shape");
    }

    return parsed as DecodedCursor;
  } catch {
    throw new Error(`Invalid pagination cursor: "${cursor}"`);
  }
}

/**
 * Builds a PostgREST `.or()` filter string that simulates the composite
 * keyset condition: (title, id) > (cursorTitle, cursorId)
 *
 * Equivalent SQL: WHERE title > $1 OR (title = $1 AND id > $2)
 *
 * Double-quotes in the title are escaped to prevent PostgREST filter injection.
 * Pure function — no side effects.
 */
export function buildCursorFilter(cursor: DecodedCursor): string {
  const safeTitle = cursor.title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gt.${cursor.id})`;
}
