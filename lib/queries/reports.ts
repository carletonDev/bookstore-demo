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
 * Derives global sales stats by aggregating across all genre rows.
 * Pure function — no side effects.
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
