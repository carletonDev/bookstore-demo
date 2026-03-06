import { createServerClient } from '@/lib/supabase/server'

interface BookPriceRow {
  id: string
  title: string
  price: number
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
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('books')
    .select('id, title, price')
    .in('id', bookIds)

  if (error) {
    throw new Error(`Failed to fetch book prices: ${error.message}`)
  }

  const priceMap = new Map<string, BookPriceRow>()
  for (const row of data) {
    priceMap.set(row.id, row as BookPriceRow)
  }

  return priceMap
}
