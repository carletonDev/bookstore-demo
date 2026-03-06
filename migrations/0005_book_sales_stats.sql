-- Add sales tracking columns to books to prevent genre double-counting
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12, 2) DEFAULT 0.00;

-- Create Security Definer trigger to bypass RLS for sales updates
CREATE OR REPLACE FUNCTION update_book_sales_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE books
  SET total_sold = total_sold + NEW.quantity,
      total_revenue = total_revenue + (NEW.quantity * NEW.purchased_price)
  WHERE id = NEW.book_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_book_sales_stats ON order_items;
CREATE TRIGGER trg_book_sales_stats AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION update_book_sales_stats();

-- Back-fill data from existing orders
UPDATE books SET
  total_sold = COALESCE((SELECT SUM(quantity) FROM order_items WHERE book_id = books.id), 0),
  total_revenue = COALESCE((SELECT SUM(quantity * purchased_price) FROM order_items WHERE book_id = books.id), 0);
