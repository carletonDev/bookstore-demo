"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { CartDrawer } from "@/components/cart-drawer";
import { useCartStore } from "@/lib/store/useCart";

/**
 * CartButton — navbar button with a counter badge that opens the CartDrawer.
 *
 * Reads totalItems() from the cart store to display the badge count.
 * Manages the open/close state of the CartDrawer slide-over.
 */
export function CartButton() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = totalItems();

  return (
    <>
      <Button
        outline
        className="relative !px-3 !py-2 text-sm"
        onClick={() => setDrawerOpen(true)}
        aria-label={`Shopping cart with ${count} items`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.572m5.98-.572h9m-9 0a3 3 0 01-5.98.572M17.25 14.25a3 3 0 005.98.572m-5.98-.572h-9m9 0a3 3 0 015.98.572M3.75 4.863l.75 9.75M20.25 4.863l-.75 9.75"
          />
        </svg>
        Cart
        {count > 0 && (
          <Badge color="red" className="ml-1 !px-1.5 !py-0.5 text-[10px]">
            {count}
          </Badge>
        )}
      </Button>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
