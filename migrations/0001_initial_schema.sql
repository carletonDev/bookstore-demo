-- =============================================================================
-- Migration: 0001_initial_schema
-- Description: Initial bookstore schema — publishers, authors, books, genres,
--              reviews (with incremental rating aggregate trigger),
--              orders, and order_items.
--
-- Environment: Supabase with automatic RLS trigger provisioning.
--              Do NOT add ALTER TABLE ... ENABLE ROW LEVEL SECURITY or
--              CREATE POLICY statements — handled by the Supabase event trigger.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()


-- ---------------------------------------------------------------------------
-- PUBLISHERS
-- ---------------------------------------------------------------------------

CREATE TABLE publishers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  website    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- AUTHORS
-- ---------------------------------------------------------------------------

CREATE TABLE authors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT        NOT NULL,
  last_name  TEXT        NOT NULL,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_authors_last_name ON authors (last_name);


-- ---------------------------------------------------------------------------
-- GENRES
-- ---------------------------------------------------------------------------

CREATE TABLE genres (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);


-- ---------------------------------------------------------------------------
-- BOOKS
-- ---------------------------------------------------------------------------

CREATE TABLE books (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  isbn            TEXT        UNIQUE,
  publisher_id    UUID        REFERENCES publishers(id) ON DELETE SET NULL,
  price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  formats         TEXT[]      NOT NULL DEFAULT '{}'
                    CHECK (formats <@ ARRAY['hardcover','softcover','audiobook','ereader']::TEXT[]),
  description     TEXT,
  cover_image_url TEXT,
  published_at    DATE,

  -- Incremental review aggregates — maintained by trigger, never written directly
  rating_sum      INTEGER     NOT NULL DEFAULT 0 CHECK (rating_sum >= 0),
  rating_count    INTEGER     NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  -- Derived average: NULL when no reviews exist (division by zero safe via NULLIF)
  rating_avg      NUMERIC(3, 2) GENERATED ALWAYS AS (
                    rating_sum::NUMERIC / NULLIF(rating_count, 0)
                  ) STORED,

  -- Full-text search vector — maintained by trigger
  search_vector   TSVECTOR,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_publisher    ON books (publisher_id);
CREATE INDEX idx_books_published    ON books (published_at DESC);
CREATE INDEX idx_books_price        ON books (price);
CREATE INDEX idx_books_formats_gin  ON books USING GIN (formats);
CREATE INDEX idx_books_search_gin   ON books USING GIN (search_vector);
-- Composite index for cursor-based pagination (primary sort: title, tiebreak: id)
CREATE INDEX idx_books_cursor       ON books (title ASC, id ASC);


-- ---------------------------------------------------------------------------
-- BOOK ↔ AUTHOR (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE book_authors (
  book_id   UUID NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

CREATE INDEX idx_book_authors_author ON book_authors (author_id);


-- ---------------------------------------------------------------------------
-- BOOK ↔ GENRE (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE book_genres (
  book_id  UUID NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre_id)
);

CREATE INDEX idx_book_genres_genre ON book_genres (genre_id);


-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    UUID     NOT NULL REFERENCES books(id)       ON DELETE CASCADE,
  user_id    UUID     NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT,
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One review per user per book
  UNIQUE (book_id, user_id)
);

CREATE INDEX idx_reviews_book ON reviews (book_id);
CREATE INDEX idx_reviews_user ON reviews (user_id);


-- ---------------------------------------------------------------------------
-- TRIGGER: Incremental rating aggregates on books
--
-- Strategy: add/subtract individual ratings rather than re-aggregating.
-- Each write is O(1) regardless of total review count.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_book_rating_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
    -- rating_count does not change on UPDATE
    UPDATE books
    SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
    WHERE id = NEW.book_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_book_rating_aggregates
AFTER INSERT OR UPDATE OF rating OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_book_rating_aggregates();


-- ---------------------------------------------------------------------------
-- TRIGGER: Full-text search vector on books
--
-- Rebuilds search_vector on INSERT or title UPDATE.
-- Author names are joined separately after book_authors rows are inserted
-- via update_book_search_vector_for_book(), called from the book_authors trigger.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_book_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', NEW.title) ||
    to_tsvector('english', COALESCE(
      (
        SELECT string_agg(a.first_name || ' ' || a.last_name, ' ')
        FROM   book_authors ba
        JOIN   authors a ON a.id = ba.author_id
        WHERE  ba.book_id = NEW.id
      ), ''
    ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_search_vector
BEFORE INSERT OR UPDATE OF title ON books
FOR EACH ROW EXECUTE FUNCTION update_book_search_vector();


-- Refresh search_vector when author associations change
CREATE OR REPLACE FUNCTION refresh_book_search_vector_on_author_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_book_id UUID;
BEGIN
  target_book_id := COALESCE(NEW.book_id, OLD.book_id);
  UPDATE books
  SET search_vector =
    to_tsvector('english', title) ||
    to_tsvector('english', COALESCE(
      (
        SELECT string_agg(a.first_name || ' ' || a.last_name, ' ')
        FROM   book_authors ba
        JOIN   authors a ON a.id = ba.author_id
        WHERE  ba.book_id = target_book_id
      ), ''
    ))
  WHERE id = target_book_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_book_search_vector_authors
AFTER INSERT OR DELETE ON book_authors
FOR EACH ROW EXECUTE FUNCTION refresh_book_search_vector_on_author_change();


-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TABLE orders (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status       order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user   ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);


-- ---------------------------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------------------------

CREATE TABLE order_items (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id         UUID    NOT NULL REFERENCES books(id)  ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  -- Snapshot of price at time of purchase — never reference books.price for history
  purchased_price NUMERIC(10, 2) NOT NULL CHECK (purchased_price >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_book  ON order_items (book_id);
