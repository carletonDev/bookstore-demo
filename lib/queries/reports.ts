import { createServerClient } from "@/lib/supabase/server";
import type { GenreSalesRow, GlobalSalesStats } from "@/types/database";

/**
 * Fetches genre-level sales data from the view_genre_sales Postgres view.
 *
 * Pattern: Facade — callers never interact with the Supabase client directly.
 * The view handles all joins (order_items → books → book_genres → genres).
 */
export async function getGenreSales(): Promise<GenreSalesRow[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("view_genre_sales")
    .select(
      "genre_id, genre_name, genre_slug, order_count, total_units_sold, total_revenue",
    )
    .order("total_revenue", { ascending: false });

  if (error) {
    throw new Error(`getGenreSales query failed: ${error.message}`);
  }

  return (data ?? []) as GenreSalesRow[];
}

/**
 * Fetches global sales stats by summing denormalized columns on the books table.
 *
 * Uses total_sold / total_revenue on books (maintained by trg_book_sales_stats)
 * instead of aggregating through genre joins, which avoids double-counting
 * books that belong to multiple genres.
 */
export async function getGlobalSalesStats(): Promise<GlobalSalesStats> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("books")
    .select("total_sold, total_revenue");

  if (error) {
    throw new Error(`getGlobalSalesStats query failed: ${error.message}`);
  }

  const rows = data ?? [];

  const totalUnitsSold = rows.reduce(
    (sum: number, row: { total_sold: number | null; total_revenue: number | null }) =>
      sum + Number(row.total_sold ?? 0),
    0,
  );
  const totalRevenue = rows.reduce(
    (sum: number, row: { total_sold: number | null; total_revenue: number | null }) =>
      sum + Number(row.total_revenue ?? 0),
    0,
  );

  // Count distinct orders from the orders table
  const { count, error: orderError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  if (orderError) {
    throw new Error(`getGlobalSalesStats order count failed: ${orderError.message}`);
  }

  return {
    totalRevenue,
    totalUnitsSold,
    totalOrders: count ?? 0,
  };
}

/**
 * Derives global sales stats by aggregating across all genre rows.
 * Pure function — no side effects.
 *
 * @deprecated Use getGlobalSalesStats() instead to avoid genre double-counting.
 */
export function aggregateGlobalStats(rows: GenreSalesRow[]): GlobalSalesStats {
  return rows.reduce<GlobalSalesStats>(
    (acc, row) => ({
      totalRevenue: acc.totalRevenue + Number(row.total_revenue),
      totalUnitsSold: acc.totalUnitsSold + Number(row.total_units_sold),
      totalOrders: acc.totalOrders + Number(row.order_count),
    }),
    { totalRevenue: 0, totalUnitsSold: 0, totalOrders: 0 },
  );
}
