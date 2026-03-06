'use server'

import { createServerClient } from '@/lib/supabase/server'

/**
 * Cart item passed to processCheckout.
 * Validated at the boundary before any database writes.
 */
export interface CheckoutItem {
  bookId: string
  quantity: number
}

/**
 * Result returned by processCheckout on success.
 */
export interface CheckoutResult {
  orderId: string
  totalAmount: number
}

/**
 * processCheckout — Server Action (Command pattern).
 *
 * Creates an order with a price snapshot captured at checkout time.
 * The purchased_price on each order_item is read from books.price at the
 * moment of insertion — never from the client. This guarantees historical
 * accuracy regardless of future price changes.
 *
 * Steps:
 *  1. Validate input at the boundary.
 *  2. Authenticate the user via Supabase session.
 *  3. Look up current book prices from the books table.
 *  4. Insert order with total_amount derived from snapshotted prices.
 *  5. Insert order_items with purchased_price = snapshot.
 */
export async function processCheckout(
  items: CheckoutItem[],
): Promise<CheckoutResult> {
  if (!items.length) {
    throw new Error('Cart is empty')
  }

  for (const item of items) {
    if (!item.bookId || item.quantity < 1) {
      throw new Error('Invalid cart item: each item must have a bookId and quantity >= 1')
    }
  }

  const supabase = await createServerClient()

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Authentication required')
  }

  // Snapshot current prices from the books table
  const bookIds = items.map((i) => i.bookId)
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, price')
    .in('id', bookIds)

  if (booksError) {
    throw new Error(`Failed to look up book prices: ${booksError.message}`)
  }

  if (!books || books.length !== bookIds.length) {
    throw new Error('One or more books not found')
  }

  const priceMap = new Map<string, number>(
    books.map((b: { id: string; price: number }) => [b.id, b.price]),
  )

  // Compute total from snapshotted prices
  let totalAmount = 0
  const orderItems = items.map((item) => {
    const price = priceMap.get(item.bookId)
    if (price === undefined) {
      throw new Error(`Price not found for book ${item.bookId}`)
    }
    totalAmount += price * item.quantity
    return {
      book_id: item.bookId,
      quantity: item.quantity,
      purchased_price: price,
    }
  })

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message}`)
  }

  // Insert order items with snapshotted prices
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(
      orderItems.map((oi) => ({
        order_id: order.id,
        ...oi,
      })),
    )

  if (itemsError) {
    throw new Error(`Failed to create order items: ${itemsError.message}`)
  }

  return {
    orderId: order.id,
    totalAmount,
  }
}
