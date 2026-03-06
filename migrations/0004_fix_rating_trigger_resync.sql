-- =============================================================================
-- Migration: 0004_fix_rating_trigger_resync
-- Description: Re-create the rating aggregate trigger to guarantee it is
--              active with the correct definition, then back-fill rating_sum
--              and rating_count on all existing books from live review data.
--
-- Why this is needed:
--   Seed data inserted via the Supabase service-role client fires the trigger
--   correctly for new rows, but if the trigger was missing or mis-defined at
--   seeding time the aggregates on existing books will be stale (all zeros).
--   This migration makes both the trigger and the data authoritative.
--
-- Safety: idempotent — safe to re-run. CREATE OR REPLACE and DROP IF EXISTS
--         mean repeated application has no side effects.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Step 1: Re-create the aggregate function
--
-- CREATE OR REPLACE replaces the body in place without needing to drop the
-- trigger first. Handles INSERT, UPDATE (rating column only), and DELETE.
-- Each operation is O(1) — incremental arithmetic, not a full re-aggregate.
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
    -- Only the delta is applied; rating_count does not change on UPDATE.
    UPDATE books
    SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
    WHERE id = NEW.book_id;
  END IF;

  RETURN NULL;
END;
$$;


-- ---------------------------------------------------------------------------
-- Step 2: Re-create the trigger
--
-- DROP IF EXISTS + CREATE guarantees the trigger is attached with the correct
-- AFTER / FOR EACH ROW / event mask regardless of prior state.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_book_rating_aggregates ON reviews;

CREATE TRIGGER trg_book_rating_aggregates
AFTER INSERT OR UPDATE OF rating OR DELETE
ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_book_rating_aggregates();


-- ---------------------------------------------------------------------------
-- Step 3: Back-fill rating_sum and rating_count for all existing books
--
-- Computes the correct values directly from the reviews table.
-- rating_avg is a GENERATED ALWAYS AS STORED column — Postgres recomputes
-- it automatically when rating_sum or rating_count changes, so it does not
-- need to be included in the SET clause.
-- ---------------------------------------------------------------------------

UPDATE books
SET
  rating_sum   = COALESCE(
    (SELECT SUM(r.rating)  FROM reviews r WHERE r.book_id = books.id),
    0
  ),
  rating_count = (
    SELECT COUNT(*)        FROM reviews r WHERE r.book_id = books.id
  );
