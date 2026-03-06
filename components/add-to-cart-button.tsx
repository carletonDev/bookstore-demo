"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { useCartStore } from "@/stores/cart";
import type { BookFormat } from "@/types/database";

type AddToCartButtonProps = {
  bookId: string;
  formats: BookFormat[];
};

/**
 * AddToCartButton — Client Component that adds a book to the Zustand cart.
 *
 * Renders a format selector (if multiple formats) and a solid Catalyst Button.
 * Uses the useCartStore.addItem action to mutate cart state.
 */
export function AddToCartButton({ bookId, formats }: AddToCartButtonProps) {
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>(formats[0]);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  function handleAdd(): void {
    addItem(bookId, selectedFormat);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="flex items-center gap-2">
      {formats.length > 1 && (
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as BookFormat)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          aria-label="Select format"
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
      <Button className="!px-3 !py-1.5 text-xs" onClick={handleAdd}>
        {added ? "Added!" : "Add to Cart"}
      </Button>
    </div>
  );
}
