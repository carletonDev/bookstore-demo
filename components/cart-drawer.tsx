"use client";

import { useTransition, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  SlideOver,
  SlideOverPanel,
  SlideOverTitle,
} from "@/components/slide-over";
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from "@/components/description-list";
import { Button } from "@/components/button";
import { useCartStore } from "@/lib/store/useCart";
import { processCheckout } from "@/lib/actions/checkout";
import { fetchCartBookInfo, type CartBookInfo } from "@/lib/actions/cart";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * CartDrawer — Catalyst slide-over panel showing the shopping cart.
 *
 * Cart store holds only bookId/format/quantity. Title and price are
 * fetched from the database via fetchCartBookInfo when the drawer opens,
 * maintaining the server as the single source of truth for metadata.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<Record<string, CartBookInfo>>({});
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // Fetch book metadata from the server when the drawer opens
  useEffect(() => {
    if (!open || items.length === 0) return;

    const bookIds = [...new Set(items.map((item) => item.bookId))];
    setIsLoadingInfo(true);
    fetchCartBookInfo(bookIds)
      .then(setBookInfo)
      .finally(() => setIsLoadingInfo(false));
  }, [open, items]);

  const subtotal = items.reduce((sum, item) => {
    const info = bookInfo[item.bookId];
    return sum + (info ? info.price * item.quantity : 0);
  }, 0);

  const handleCheckout = useCallback(() => {
    setCheckoutError(null);
    startTransition(async () => {
      const result = await processCheckout(
        items.map((item) => ({
          bookId: item.bookId,
          format: item.format,
          quantity: item.quantity,
        })),
      );

      if (result.success) {
        clearCart();
        onClose();
        router.push(`/orders/success?orderId=${result.orderId}`);
      } else {
        setCheckoutError(result.error ?? "Checkout failed.");
      }
    });
  }, [items, clearCart, onClose, router]);

  return (
    <SlideOver open={open} onClose={onClose}>
      <SlideOverPanel>
        <div className="flex items-center justify-between">
          <SlideOverTitle>Shopping Cart</SlideOverTitle>
          <Button plain onClick={onClose} aria-label="Close cart">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </Button>
        </div>

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
          {items.length === 0 ? (
            <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
              Your cart is empty.
            </p>
          ) : isLoadingInfo ? (
            <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
              Loading cart...
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {items.map((item) => {
                const info = bookInfo[item.bookId];
                const title = info?.title ?? "Unknown Book";
                const price = info?.price ?? 0;

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
                            ? updateQuantity(
                                item.bookId,
                                item.format,
                                item.quantity - 1,
                              )
                            : removeItem(item.bookId, item.format)
                        }
                        aria-label={`Decrease quantity of ${title}`}
                      >
                        -
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm/6 text-zinc-950 dark:text-white">
                        {item.quantity}
                      </span>
                      <Button
                        plain
                        className="!px-2 !py-1 text-xs"
                        onClick={() =>
                          updateQuantity(
                            item.bookId,
                            item.format,
                            item.quantity + 1,
                          )
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
                );
              })}
            </ul>
          )}
        </div>

        {/* Order summary */}
        {items.length > 0 && !isLoadingInfo && (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <DescriptionList>
              {items.map((item) => {
                const info = bookInfo[item.bookId];
                return (
                  <div
                    key={`${item.bookId}-${item.format}-summary`}
                    className="flex items-center justify-between py-2"
                  >
                    <DescriptionTerm>
                      {info?.title ?? "Unknown"}
                    </DescriptionTerm>
                    <DescriptionDetails>
                      {item.format} x {item.quantity} ={" "}
                      {formatPrice((info?.price ?? 0) * item.quantity)}
                    </DescriptionDetails>
                  </div>
                );
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
                {isPending ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </div>
        )}
      </SlideOverPanel>
    </SlideOver>
  );
}
