"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BookFormat } from "@/types/database";

export interface CartItem {
  bookId: string;
  title: string;
  price: number;
  format: BookFormat;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Pick<CartItem, "bookId" | "title" | "price" | "format">) => void;
  removeItem: (bookId: string, format: BookFormat) => void;
  updateQuantity: (bookId: string, format: BookFormat, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

function findIndex(
  items: CartItem[],
  bookId: string,
  format: BookFormat,
): number {
  return items.findIndex(
    (item) => item.bookId === bookId && item.format === format,
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(input) {
        set((state) => {
          const idx = findIndex(state.items, input.bookId, input.format);
          if (idx >= 0) {
            const updated = [...state.items];
            updated[idx] = {
              ...updated[idx],
              quantity: updated[idx].quantity + 1,
            };
            return { items: updated };
          }
          return {
            items: [
              ...state.items,
              {
                bookId: input.bookId,
                title: input.title,
                price: input.price,
                format: input.format,
                quantity: 1,
              },
            ],
          };
        });
      },

      removeItem(bookId: string, format: BookFormat) {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.bookId === bookId && item.format === format),
          ),
        }));
      },

      updateQuantity(bookId: string, format: BookFormat, quantity: number) {
        if (quantity < 1) return;
        set((state) => {
          const idx = findIndex(state.items, bookId, format);
          if (idx < 0) return state;
          const updated = [...state.items];
          updated[idx] = { ...updated[idx], quantity };
          return { items: updated };
        });
      },

      clearCart() {
        set({ items: [] });
      },

      totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      subtotal() {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
      },
    }),
    {
      name: "codex-cart",
    },
  ),
);
