import { createServerClient } from "@/lib/supabase/server";
import {
  encodeCursor,
  decodeCursor,
  buildCursorFilter,
} from "@/lib/utils/pagination";
import type {
  BookCatalogItemWithRelations,
  BookFormat,
  BookSearchParams,
  PaginatedResult,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Select fragments (DRY — one definition per query shape)
// ---------------------------------------------------------------------------

/**
 * Standard catalog select: all catalog fields + related publisher, authors, genres.
 * book_genres uses a regular join so books without genres are still returned.
 */
const CATALOG_SELECT = `
  id,
  title,
  isbn,
  publisher_id,
  price,
  formats,
  cover_image_url,
  published_at,
  rating_avg,
  rating_count,
  publisher:publishers (
    id,
    name
  ),
  book_authors (
    author:authors (
      id,
      first_name,
      last_name
    )
  ),
  book_genres (
    genre:genres (
      id,
      name,
      slug
    )
  )
` as const;

/**
 * Genre-filtered catalog select: book_genres uses !inner so PostgREST
 * performs an INNER JOIN — only books that belong to the genre are returned.
 * genres also uses !inner to ensure the slug filter propagates correctly.
 */
const CATALOG_SELECT_GENRE_FILTER = `
  id,
  title,
  isbn,
  publisher_id,
  price,
  formats,
  cover_image_url,
  published_at,
  rating_avg,
  rating_count,
  publisher:publishers (
    id,
    name
  ),
  book_authors (
    author:authors (
      id,
      first_name,
      last_name
    )
  ),
  book_genres!inner (
    genre:genres!inner (
      id,
      name,
      slug
    )
  )
` as const;

const DEFAULT_PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Raw PostgREST response types (before adaptation)
// ---------------------------------------------------------------------------

/**
 * Shape returned by Supabase for the catalog select query.
 * Nested join tables use the aliased sub-object shape from PostgREST.
 * Kept private — consumers only see BookCatalogItemWithRelations.
 */
interface RawBookCatalogRow {
  id: string;
  title: string;
  isbn: string | null;
  publisher_id: string | null;
  price: number;
  formats: string[];
  cover_image_url: string | null;
  published_at: string | null;
  rating_avg: number | null;
  rating_count: number;
  publisher: { id: string; name: string } | null;
  book_authors: {
    author: { id: string; first_name: string; last_name: string };
  }[];
  book_genres: { genre: { id: string; name: string; slug: string } }[];
}

// ---------------------------------------------------------------------------
// Adapter (Structural pattern)
// Maps the raw PostgREST row shape to BookCatalogItemWithRelations.
// Database schema changes should only require updating this function.
// ---------------------------------------------------------------------------

function adaptBookCatalogRow(
  row: RawBookCatalogRow,
): BookCatalogItemWithRelations {
  return {
    id: row.id,
    title: row.title,
    isbn: row.isbn,
    publisher_id: row.publisher_id,
    price: row.price,
    formats: row.formats as BookFormat[],
    cover_image_url: row.cover_image_url,
    published_at: row.published_at,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    publisher: row.publisher,
    // Flatten nested join-table shape: [{ author: {...} }] → [{ id, first_name, last_name }]
    authors: row.book_authors.map((ba) => ba.author),
    genres: row.book_genres.map((bg) => bg.genre),
  };
}

// ---------------------------------------------------------------------------
// Public query — Facade over the Supabase client
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated, optionally filtered, optionally searched list of books.
 *
 * Index usage:
 *  - Full-text search  → idx_books_search_gin  (GIN on search_vector)
 *  - Format filter     → idx_books_formats_gin (GIN on formats)
 *  - Price range       → idx_books_price
 *  - Genre filter      → idx_book_genres_genre (via !inner join)
 *  - Cursor pagination → idx_books_cursor      (composite: title ASC, id ASC)
 *
 * Pattern: Builder — query is composed incrementally; each optional param
 * appends a clause rather than branching through a monolithic conditional.
 *
 * Pattern: Facade — callers never interact with the Supabase client directly.
 */
export async function getBooks(
  params: BookSearchParams,
): Promise<PaginatedResult<BookCatalogItemWithRelations>> {
  const supabase = await createServerClient();

  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  // Fetch one extra row to determine whether a next page exists.
  const fetchLimit = limit + 1;

  // Strategy: choose select fragment based on whether genre filtering is needed.
  // The !inner join in CATALOG_SELECT_GENRE_FILTER excludes books not in the genre.
  const selectFragment = params.genreSlug
    ? CATALOG_SELECT_GENRE_FILTER
    : CATALOG_SELECT;

  // Builder: start with base query, stable sort by (title ASC, id ASC) matches
  // the idx_books_cursor composite index for O(log n) keyset pagination.
  let query = supabase
    .from("books")
    .select(selectFragment)
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .limit(fetchLimit);

  // Full-text search — uses idx_books_search_gin (GIN on search_vector).
  // plainto_tsquery is used (not to_tsquery) so raw user input is safe without escaping.
  if (params.query?.trim()) {
    query = query.textSearch("search_vector", params.query.trim(), {
      type: "plain",
      config: "english",
    });
  }

  // Genre filter — the !inner join in CATALOG_SELECT_GENRE_FILTER drives the
  // INNER JOIN; this eq narrows to the specific slug within that join.
  if (params.genreSlug) {
    query = query.eq("book_genres.genres.slug", params.genreSlug);
  }

  // Format filter — uses idx_books_formats_gin via the @> (contains) operator.
  if (params.format) {
    query = query.contains("formats", [params.format]);
  }

  // Price range filters — uses idx_books_price.
  if (params.minPrice !== undefined) {
    query = query.gte("price", params.minPrice);
  }
  if (params.maxPrice !== undefined) {
    query = query.lte("price", params.maxPrice);
  }

  // Cursor-based pagination — decodes the opaque cursor and applies the
  // keyset filter: (title > cursorTitle) OR (title = cursorTitle AND id > cursorId)
  // This uses idx_books_cursor in O(log n) regardless of dataset position.
  if (params.cursor) {
    const decoded = decodeCursor(params.cursor);
    query = query.or(buildCursorFilter(decoded));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getBooks query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawBookCatalogRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasMore && lastRow ? encodeCursor(lastRow.title, lastRow.id) : null;

  return {
    data: pageRows.map(adaptBookCatalogRow),
    nextCursor,
    hasMore,
  };
}
