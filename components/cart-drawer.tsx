'use client'

import { useTransition, useState, useCallback } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@/components/dialog'
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from '@/components/description-list'
import { Button } from '@/components/button'
import { useCartStore, type CartItem } from '@/stores/cart'
import { processCheckout } from '@/lib/actions/checkout'

type CartDrawerProps = {
  open: boolean
  onClose: () => void
  /** Map of bookId → { title, price } for display. Passed from the parent
   *  that has access to book data. */
  bookInfo: Map<string, { title: string; price: number }>
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatLabel(item: CartItem): string {
  return `${item.format} × ${item.quantity}`
}

/**
 * CartDrawer — Catalyst slide-over panel showing the shopping cart.
 *
 * Uses the Dialog (slide-over) for the panel and DescriptionList for
 * the order summary. Checkout triggers the processCheckout Server Action
 * which re-fetches live prices from the database.
 */
export function CartDrawer({ open, onClose, bookInfo }: CartDrawerProps) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)

  const [isPending, startTransition] = useTransition()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const subtotal = items.reduce((sum, item) => {
    const info = bookInfo.get(item.bookId)
    return sum + (info ? info.price * item.quantity : 0)
  }, 0)

  const handleCheckout = useCallback(() => {
    setCheckoutError(null)
    startTransition(async () => {
      const result = await processCheckout(
        items.map((item) => ({
          bookId: item.bookId,
          format: item.format,
          quantity: item.quantity,
        })),
      )

      if (result.success) {
        setOrderId(result.orderId ?? null)
        clearCart()
      } else {
        setCheckoutError(result.error ?? 'Checkout failed.')
      }
    })
  }, [items, clearCart])

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogPanel>
        <div className="flex items-center justify-between">
          <DialogTitle>Shopping Cart</DialogTitle>
          <Button plain onClick={onClose} aria-label="Close cart">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </Button>
        </div>

        {/* Success message */}
        {orderId && (
          <div className="mt-4 rounded-lg bg-green-50 p-4 ring-1 ring-inset ring-green-200 dark:bg-green-950/30 dark:ring-green-800">
            <p className="text-sm/6 font-medium text-green-800 dark:text-green-300">
              Order placed successfully!
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              Order ID: {orderId}
            </p>
          </div>
        )}

        {/* Error message */}
        {checkoutError && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 ring-1 ring-inset ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
            <p className="text-sm/6 text-red-800 dark:text-red-300">
              {checkoutError}
            </p>
          </div>
        )}

        {/* Cart items */}
        <div className="mt-6 flex-1">
          {items.length === 0 && !orderId ? (
            <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
              Your cart is empty.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {items.map((item) => {
                const info = bookInfo.get(item.bookId)
                const title = info?.title ?? 'Unknown Book'
                const price = info?.price ?? 0

                return (
                  <li
                    key={`${item.bookId}-${item.format}`}
                    className="py-4 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm/6 font-medium text-zinc-950 dark:text-white">
                          {title}
                        </p>
                        <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
                          {item.format}
                        </p>
                      </div>
                      <p className="text-sm/6 font-medium text-zinc-950 dark:text-white">
                        {formatPrice(price * item.quantity)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        plain
                        className="!px-2 !py-1 text-xs"
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.bookId, item.format, item.quantity - 1)
                            : removeItem(item.bookId, item.format)
                        }
                        aria-label={`Decrease quantity of ${title}`}
                      >
                        −
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm/6 text-zinc-950 dark:text-white">
                        {item.quantity}
                      </span>
                      <Button
                        plain
                        className="!px-2 !py-1 text-xs"
                        onClick={() =>
                          updateQuantity(item.bookId, item.format, item.quantity + 1)
                        }
                        aria-label={`Increase quantity of ${title}`}
                      >
                        +
                      </Button>
                      <Button
                        plain
                        className="ml-auto text-xs text-red-600 dark:text-red-400"
                        onClick={() => removeItem(item.bookId, item.format)}
                        aria-label={`Remove ${title} from cart`}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Order summary */}
        {items.length > 0 && (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <DescriptionList>
              {items.map((item) => {
                const info = bookInfo.get(item.bookId)
                return (
                  <div
                    key={`${item.bookId}-${item.format}-summary`}
                    className="flex items-center justify-between py-2"
                  >
                    <DescriptionTerm>
                      {info?.title ?? 'Unknown'}
                    </DescriptionTerm>
                    <DescriptionDetails>
                      {formatLabel(item)} = {formatPrice((info?.price ?? 0) * item.quantity)}
                    </DescriptionDetails>
                  </div>
                )
              })}

              <div className="flex items-center justify-between py-3">
                <DescriptionTerm className="font-semibold text-zinc-950 dark:text-white">
                  Subtotal
                </DescriptionTerm>
                <DescriptionDetails className="font-semibold">
                  {formatPrice(subtotal)}
                </DescriptionDetails>
              </div>
            </DescriptionList>

            <div className="mt-6">
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={isPending}
              >
                {isPending ? 'Processing…' : 'Checkout'}
              </Button>
            </div>
          </div>
        )}
      </DialogPanel>
    </Dialog>
  )
}
