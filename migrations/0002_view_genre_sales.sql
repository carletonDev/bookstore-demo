-- =============================================================================
-- Migration: 0002_view_genre_sales
-- Description: Materialized-style VIEW for genre sales reporting.
--              Aggregates total revenue, units sold, and order count per genre.
--              Joins order_items → books → book_genres → genres.
-- =============================================================================

CREATE OR REPLACE VIEW view_genre_sales AS
SELECT
  g.id          AS genre_id,
  g.name        AS genre_name,
  g.slug        AS genre_slug,
  COUNT(DISTINCT o.id)            AS order_count,
  COALESCE(SUM(oi.quantity), 0)   AS total_units_sold,
  COALESCE(SUM(oi.quantity * oi.purchased_price), 0) AS total_revenue
FROM genres g
LEFT JOIN book_genres bg ON bg.genre_id = g.id
LEFT JOIN order_items oi ON oi.book_id = bg.book_id
LEFT JOIN orders o       ON o.id = oi.order_id
GROUP BY g.id, g.name, g.slug
ORDER BY total_revenue DESC;
