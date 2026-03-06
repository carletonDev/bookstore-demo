import { createServerClient } from "@/lib/supabase/server";
import type {
  OrderWithItems,
  OrderItemWithBook,
  OrderItemBook,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Raw PostgREST response types (before adaptation)
// ---------------------------------------------------------------------------

interface RawOrderItemRow {
  id: string;
  order_id: string;
  book_id: string;
  quantity: number;
  purchased_price: number;
  created_at: string;
  book: { id: string; title: string; cover_image_url: string | null };
}

interface RawOrderRow {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_items: RawOrderItemRow[];
}

// ---------------------------------------------------------------------------
// Adapter — maps raw PostgREST shape to OrderWithItems
// ---------------------------------------------------------------------------

function adaptOrderRow(row: RawOrderRow): OrderWithItems {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status as OrderWithItems["status"],
    total_amount: row.total_amount,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items: row.order_items.map(
      (item): OrderItemWithBook => ({
        id: item.id,
        order_id: item.order_id,
        book_id: item.book_id,
        quantity: item.quantity,
        purchased_price: item.purchased_price,
        created_at: item.created_at,
        book: item.book as OrderItemBook,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Select fragment (DRY)
// ---------------------------------------------------------------------------

const ORDER_HISTORY_SELECT = `
  id,
  user_id,
  status,
  total_amount,
  created_at,
  updated_at,
  order_items (
    id,
    order_id,
    book_id,
    quantity,
    purchased_price,
    created_at,
    book:books (
      id,
      title,
      cover_image_url
    )
  )
` as const;

/**
 * Fetches all orders for a given user, most recent first.
 *
 * Pattern: Facade — callers never interact with the Supabase client.
 * purchased_price is the historical snapshot, not the live book price.
 */
export async function getOrderHistory(
  userId: string,
): Promise<OrderWithItems[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`getOrderHistory query failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawOrderRow[]).map(adaptOrderRow);
}

// ---------------------------------------------------------------------------
// Book price lookup (used by processCheckout)
// ---------------------------------------------------------------------------

interface BookPriceRow {
  id: string;
  title: string;
  price: number;
}

/**
 * Fetches the current live prices for a set of book IDs.
 *
 * Used by processCheckout to snapshot the price at the moment of purchase.
 * Returns a Map keyed by book ID for O(1) lookup.
 *
 * Pattern: Facade — callers get a clean domain result, not raw Supabase rows.
 */
export async function getBookPrices(
  bookIds: string[],
): Promise<Map<string, BookPriceRow>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("books")
    .select("id, title, price")
    .in("id", bookIds);

  if (error) {
    throw new Error(`Failed to fetch book prices: ${error.message}`);
  }

  const priceMap = new Map<string, BookPriceRow>();
  for (const row of data) {
    priceMap.set(row.id, row as BookPriceRow);
  }

  return priceMap;
}
