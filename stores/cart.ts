'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookFormat } from '@/types/database'

export interface CartItem {
  bookId: string
  format: BookFormat
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (bookId: string, format: BookFormat) => void
  removeItem: (bookId: string, format: BookFormat) => void
  updateQuantity: (bookId: string, format: BookFormat, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
}

function findIndex(items: CartItem[], bookId: string, format: BookFormat): number {
  return items.findIndex(
    (item) => item.bookId === bookId && item.format === format,
  )
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(bookId: string, format: BookFormat) {
        set((state) => {
          const idx = findIndex(state.items, bookId, format)
          if (idx >= 0) {
            const updated = [...state.items]
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
            return { items: updated }
          }
          return { items: [...state.items, { bookId, format, quantity: 1 }] }
        })
      },

      removeItem(bookId: string, format: BookFormat) {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.bookId === bookId && item.format === format),
          ),
        }))
      },

      updateQuantity(bookId: string, format: BookFormat, quantity: number) {
        if (quantity < 1) return
        set((state) => {
          const idx = findIndex(state.items, bookId, format)
          if (idx < 0) return state
          const updated = [...state.items]
          updated[idx] = { ...updated[idx], quantity }
          return { items: updated }
        })
      },

      clearCart() {
        set({ items: [] })
      },

      totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'codex-cart',
    },
  ),
)
