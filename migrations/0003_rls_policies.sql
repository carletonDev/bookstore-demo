-- =============================================================================
-- Migration: 0003_rls_policies
-- Description: Row Level Security policies for the bookstore schema.
--
-- Environment: Supabase with automatic RLS trigger provisioning.
--              Do NOT add ALTER TABLE ... ENABLE ROW LEVEL SECURITY —
--              that is handled by the Supabase event trigger on table creation.
--
-- Policy matrix:
--   Table          anon SELECT  auth SELECT  auth INSERT  auth UPDATE  auth DELETE
--   ─────────────  ───────────  ───────────  ───────────  ───────────  ───────────
--   publishers         ✓            ✓
--   authors            ✓            ✓
--   genres             ✓            ✓
--   books              ✓            ✓
--   book_authors       ✓            ✓
--   book_genres        ✓            ✓
--   reviews            ✓            ✓        own row      own row      own row
--   orders                          ✓        own row
--   order_items                     ✓        own order
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PUBLISHERS — public read
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to publishers"
ON publishers
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- AUTHORS — public read
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to authors"
ON authors
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- GENRES — public read
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to genres"
ON genres
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- BOOKS — public read
--
-- Covers all columns including rating_sum, rating_count, rating_avg
-- (maintained by trigger) and search_vector (used by FTS queries).
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to books"
ON books
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- BOOK_AUTHORS — public read
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to book_authors"
ON book_authors
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- BOOK_GENRES — public read
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to book_genres"
ON book_genres
FOR SELECT
TO anon, authenticated
USING (true);


-- ---------------------------------------------------------------------------
-- REVIEWS
--
-- Everyone can read reviews (social proof on the catalog page).
-- Only the review author can write, update, or delete their own review.
-- The UNIQUE (book_id, user_id) constraint on the table enforces one review
-- per user per book at the database level; the INSERT policy enforces it
-- at the authorization level.
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access to reviews"
ON reviews
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can create their own reviews"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- ORDERS
--
-- Users can only see and place their own orders.
-- No UPDATE or DELETE — order history is immutable once placed.
-- Status transitions (pending → confirmed → shipped etc.) are performed
-- by service-role functions only, not by the client.
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read their own orders"
ON orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- ORDER_ITEMS
--
-- order_items has no user_id column — ownership is derived through the
-- parent orders row. A subquery checks that the related order belongs to
-- the authenticated user before allowing SELECT or INSERT.
--
-- No UPDATE or DELETE — line items are immutable once the order is placed.
-- purchased_price is a historical snapshot and must never change.
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read their own order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM   orders
    WHERE  orders.id      = order_items.order_id
    AND    orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert order items into their own orders"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM   orders
    WHERE  orders.id      = order_items.order_id
    AND    orders.user_id = auth.uid()
  )
);
