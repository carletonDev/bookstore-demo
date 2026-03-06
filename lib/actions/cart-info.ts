"use server";

import { getBookPrices } from "@/lib/queries/orders";

export interface BookInfoEntry {
  id: string;
  title: string;
  price: number;
}

/**
 * Server Action: fetchCartBookInfo
 *
 * Fetches display info (title, price) for a set of book IDs in the cart.
 * Returns a serialisable array (Maps are not serialisable across the wire).
 */
export async function fetchCartBookInfo(
  bookIds: string[],
): Promise<BookInfoEntry[]> {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return [];

  const priceMap = await getBookPrices(bookIds);
  const entries: BookInfoEntry[] = [];
  for (const [id, row] of priceMap) {
    entries.push({ id, title: row.title, price: row.price });
  }
  return entries;
}
