import { createServerClient } from "@/lib/supabase/server";

export interface UserStats {
  booksPurchased: number;
  recentReviewCount: number;
}

/**
 * Fetches quick stats for the authenticated user's dashboard.
 *
 * - booksPurchased: total quantity of books across all orders
 * - recentReviewCount: number of reviews submitted by the user
 *
 * Pattern: Facade — callers never interact with the Supabase client.
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createServerClient();

  const [ordersResult, reviewsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("quantity, order:orders!inner(user_id)")
      .eq("order.user_id", userId),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const booksPurchased = (ordersResult.data ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );

  return {
    booksPurchased,
    recentReviewCount: reviewsResult.count ?? 0,
  };
}
