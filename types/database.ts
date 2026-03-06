// =============================================================================
// types/database.ts
// Single source of truth for all database-derived TypeScript types.
// Generated from migrations/0001_initial_schema.sql — keep in sync with DDL.
//
// Rules:
//  - No Supabase client logic here — types only.
//  - TIMESTAMPTZ and DATE columns are ISO 8601 strings at the application layer.
//  - NUMERIC columns are number (JS does not distinguish numeric precision).
//  - UUID columns are string.
//  - rating_avg is number | null — NULL when a book has zero reviews.
// =============================================================================


// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

/** Maps to the `order_status` Postgres ENUM. */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** Maps to the CHECK constraint on `books.formats`. */
export type BookFormat =
  | 'hardcover'
  | 'softcover'
  | 'audiobook'
  | 'ereader';

/** Valid star rating values — maps to `reviews.rating` CHECK (rating BETWEEN 1 AND 5). */
export type StarRating = 1 | 2 | 3 | 4 | 5;


// ---------------------------------------------------------------------------
// Base Interfaces — one per table, columns map 1:1 to DDL
// ---------------------------------------------------------------------------

export interface Publisher {
  id: string;
  name: string;
  website: string | null;
  created_at: string; // TIMESTAMPTZ → ISO 8601
}

export interface Author {
  id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  created_at: string; // TIMESTAMPTZ → ISO 8601
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Book {
  id: string;
  title: string;
  isbn: string | null;
  publisher_id: string | null;
  price: number;                  // NUMERIC(10,2)
  formats: BookFormat[];          // TEXT[] with CHECK constraint
  description: string | null;
  cover_image_url: string | null;
  published_at: string | null;    // DATE → ISO 8601 date string (YYYY-MM-DD)

  // Denormalized review aggregates — maintained by Postgres trigger.
  // Direct writes to these columns are prohibited; use the reviews table.
  rating_sum: number;             // Running total of all rating values
  rating_count: number;           // Total number of reviews
  rating_avg: number | null;      // GENERATED ALWAYS AS — NULL when rating_count = 0

  // Full-text search vector — maintained by Postgres trigger.
  // Not typically selected in application queries; used for FTS filtering only.
  search_vector?: string;

  created_at: string;             // TIMESTAMPTZ → ISO 8601
  updated_at: string;             // TIMESTAMPTZ → ISO 8601
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: StarRating;
  title: string | null;
  body: string | null;
  created_at: string;             // TIMESTAMPTZ → ISO 8601
  updated_at: string;             // TIMESTAMPTZ → ISO 8601
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;           // NUMERIC(10,2)
  created_at: string;             // TIMESTAMPTZ → ISO 8601
  updated_at: string;             // TIMESTAMPTZ → ISO 8601
}

export interface OrderItem {
  id: string;
  order_id: string;
  book_id: string;
  quantity: number;
  /** Snapshot of books.price at the moment of purchase. Never derive order
   *  history totals from the live books.price — use this field. */
  purchased_price: number;        // NUMERIC(10,2)
  created_at: string;             // TIMESTAMPTZ → ISO 8601
}


// ---------------------------------------------------------------------------
// Join Table Row Types (rarely needed directly, included for completeness)
// ---------------------------------------------------------------------------

export interface BookAuthor {
  book_id: string;
  author_id: string;
}

export interface BookGenre {
  book_id: string;
  genre_id: string;
}


// ---------------------------------------------------------------------------
// Enriched / Relational Types — for common joined queries
// ---------------------------------------------------------------------------

/** Full book record with all relations hydrated.
 *  Used on the book detail page and anywhere the full context is required. */
export interface BookWithRelations extends Book {
  publisher: Publisher | null;
  authors: Author[];
  genres: Genre[];
}

/** Slim book projection used inside order line items.
 *  Only the fields needed to render an order summary are included (ISP). */
export type OrderItemBook = Pick<Book, 'id' | 'title' | 'cover_image_url'>;

/** Order line item with its nested book projection. */
export interface OrderItemWithBook extends OrderItem {
  book: OrderItemBook;
}

/** Complete order with all line items and their nested book projections.
 *  Used on the order confirmation and order history pages. */
export interface OrderWithItems extends Order {
  items: OrderItemWithBook[];
}

/** Slim book projection for the catalog card — excludes heavy fields
 *  (description, search_vector, raw aggregate columns) not needed for listing. */
export type BookCatalogItem = Pick<
  Book,
  | 'id'
  | 'title'
  | 'isbn'
  | 'publisher_id'
  | 'price'
  | 'formats'
  | 'cover_image_url'
  | 'published_at'
  | 'rating_avg'
  | 'rating_count'
>;

/** Catalog card with genre and author data for filter/display — avoids
 *  over-fetching description and search_vector on list views. */
export interface BookCatalogItemWithRelations extends BookCatalogItem {
  publisher: Pick<Publisher, 'id' | 'name'> | null;
  authors: Pick<Author, 'id' | 'first_name' | 'last_name'>[];
  genres: Genre[];
}


// ---------------------------------------------------------------------------
// Pagination — cursor-based (keyset) pagination envelope
// ---------------------------------------------------------------------------

/** Opaque cursor encoding a (title, id) tuple for keyset pagination.
 *  Encoded as base64 JSON; decoded only in lib/utils/pagination.ts. */
export type PaginationCursor = string;

/** Generic paginated result envelope for any list query. */
export interface PaginatedResult<T> {
  data: T[];
  /** Base64-encoded cursor pointing to the last item in `data`.
   *  Pass as `cursor` to the next query. NULL when this is the final page. */
  nextCursor: PaginationCursor | null;
  hasMore: boolean;
}


// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Parameters for the unified book search + filter query. */
export interface BookSearchParams {
  /** Full-text search term matched against title and author names. */
  query?: string;
  genreSlug?: string;
  format?: BookFormat;
  minPrice?: number;
  maxPrice?: number;
  cursor?: PaginationCursor;
  /** Number of results per page. Defaults to 20. */
  limit?: number;
}
