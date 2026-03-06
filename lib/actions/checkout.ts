'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/currentUser'
import { getBookPrices } from '@/lib/queries/orders'
import type { BookFormat } from '@/types/database'

export interface CheckoutItem {
  bookId: string
  format: BookFormat
  quantity: number
}

export interface CheckoutResult {
  success: boolean
  orderId?: string
  error?: string
}

/**
 * Server Action: processCheckout
 *
 * Command pattern — single responsibility: validate session, snapshot live
 * prices, and persist the order atomically.
 *
 * Senior Requirement: Re-fetches the current live price for each book from
 * the database at the moment of execution. Saves this price into
 * order_items.purchased_price to preserve historical data integrity.
 */
export async function processCheckout(
  items: CheckoutItem[],
): Promise<CheckoutResult> {
  // ── Authorization: require a valid user session ──
  const userId = await getCurrentUser()
  if (!userId) {
    return { success: false, error: 'You must be signed in to checkout.' }
  }

  // ── Input validation at the boundary ──
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'Cart is empty.' }
  }

  for (const item of items) {
    if (typeof item.bookId !== 'string' || !item.bookId) {
      return { success: false, error: 'Invalid book ID in cart.' }
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return { success: false, error: 'Invalid quantity in cart.' }
    }
  }

  // ── Re-fetch live prices from the database ──
  const bookIds = [...new Set(items.map((item) => item.bookId))]
  const priceMap = await getBookPrices(bookIds)

  // Verify all books exist
  for (const bookId of bookIds) {
    if (!priceMap.has(bookId)) {
      return {
        success: false,
        error: `Book not found: ${bookId}. It may have been removed.`,
      }
    }
  }

  // ── Compute total from live prices ──
  let totalAmount = 0
  const orderItems: {
    book_id: string
    quantity: number
    purchased_price: number
  }[] = []

  for (const item of items) {
    const book = priceMap.get(item.bookId)!
    const lineTotal = book.price * item.quantity
    totalAmount += lineTotal

    orderItems.push({
      book_id: item.bookId,
      quantity: item.quantity,
      purchased_price: book.price,
    })
  }

  // Round to 2 decimal places to avoid floating point drift
  totalAmount = Math.round(totalAmount * 100) / 100

  // ── Persist order and order items ──
  const supabase = await createServerClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending' as const,
      total_amount: totalAmount,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return {
      success: false,
      error: `Failed to create order: ${orderError?.message ?? 'Unknown error'}`,
    }
  }

  const itemsWithOrderId = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithOrderId)

  if (itemsError) {
    return {
      success: false,
      error: `Failed to save order items: ${itemsError.message}`,
    }
  }

  return { success: true, orderId: order.id }
}
