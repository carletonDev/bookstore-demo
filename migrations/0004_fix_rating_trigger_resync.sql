-- 1. UPGRADE THE FUNCTION TO SECURITY DEFINER
-- This allows the trigger to update the books table even though the user cannot.
CREATE OR REPLACE FUNCTION update_book_rating_aggregates()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER -- <--- THE FIX: Runs as the owner (postgres)
SET search_path = public -- Security best practice for SECURITY DEFINER
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
        UPDATE books
        SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
        WHERE id = NEW.book_id;
    END IF;

    RETURN NULL;
END;
$$;

