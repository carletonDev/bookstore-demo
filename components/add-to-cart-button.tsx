"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { useCartStore } from "@/lib/store/useCart";
import type { BookFormat } from "@/types/database";

interface AddToCartButtonProps {
  bookId: string;
  formats: BookFormat[];
}

/**
 * AddToCartButton — client component that adds a book to the cart.
 *
 * Only passes bookId to the cart store. Title/price metadata is fetched
 * from the database on the server (single source of truth).
 */
export function AddToCartButton({ bookId, formats }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>(formats[0]);

  function handleAdd(): void {
    addItem(bookId, selectedFormat);
  }

  return (
    <div className="flex items-center gap-2">
      {formats.length > 1 && (
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as BookFormat)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          aria-label="Select format"
        >
          {formats.map((fmt) => (
            <option key={fmt} value={fmt}>
              {fmt}
            </option>
          ))}
        </select>
      )}
      <Button outline className="flex-1 text-xs !py-2" onClick={handleAdd}>
        Add to Cart
      </Button>
    </div>
  );
}
