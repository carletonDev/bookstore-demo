"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { CartDrawer } from "@/components/cart-drawer";
import { useCartStore } from "@/stores/cart";
import { fetchCartBookInfo } from "@/lib/actions/cart-info";
import type { BookInfoEntry } from "@/lib/actions/cart-info";

/**
 * CatalogCartShell — Client wrapper rendered in the catalog layout.
 *
 * Responsibilities:
 * 1. Cart trigger button with a dynamic Badge showing totalItems.
 * 2. Fetches book info (title, price) when the drawer opens.
 * 3. Renders CartDrawer as a slide-over.
 */
export function CatalogCartShell(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [bookInfo, setBookInfo] = useState<
    Map<string, { title: string; price: number }>
  >(new Map());

  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = totalItems();

  async function handleOpen(): Promise<void> {
    setOpen(true);
    const bookIds = [...new Set(items.map((i) => i.bookId))];
    if (bookIds.length === 0) {
      setBookInfo(new Map());
      return;
    }
    const entries: BookInfoEntry[] = await fetchCartBookInfo(bookIds);
    const map = new Map<string, { title: string; price: number }>();
    for (const entry of entries) {
      map.set(entry.id, { title: entry.title, price: entry.price });
    }
    setBookInfo(map);
  }

  return (
    <>
      <Button
        outline
        className="relative !px-3 !py-1.5 text-xs"
        onClick={handleOpen}
        aria-label="Open shopping cart"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.867l1.58-6.912H5.81M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
          />
        </svg>
        Cart
        {count > 0 && (
          <Badge color="amber" className="ml-1 !px-1.5 !py-0.5 text-[10px]">
            {count}
          </Badge>
        )}
      </Button>

      <CartDrawer
        open={open}
        onClose={() => setOpen(false)}
        bookInfo={bookInfo}
      />
    </>
  );
}
