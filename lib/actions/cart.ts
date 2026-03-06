"use server";

import { getBookPrices } from "@/lib/queries/orders";

export interface CartBookInfo {
  id: string;
  title: string;
  price: number;
}

/**
 * Server Action: fetchCartBookInfo
 *
 * Fetches title and price for a set of book IDs from the database.
 * Used by the CartDrawer to display accurate, server-sourced metadata
 * rather than relying on client-stored prices (single source of truth).
 *
 * Returns a plain Record (JSON-serializable) keyed by book ID.
 */
export async function fetchCartBookInfo(
  bookIds: string[],
): Promise<Record<string, CartBookInfo>> {
  if (bookIds.length === 0) {
    return {};
  }

  const priceMap = await getBookPrices(bookIds);
  const result: Record<string, CartBookInfo> = {};

  for (const [id, row] of priceMap) {
    result[id] = { id: row.id, title: row.title, price: row.price };
  }

  return result;
}
