import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase client — intercepts all database calls
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockSingle = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

// Chain builder helpers
function chainSelect() {
  return { in: mockIn, eq: mockEq, single: mockSingle }
}

function chainInsert() {
  return { select: vi.fn().mockReturnValue({ single: mockSingle }) }
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => mockSupabase),
}))

// Must import after mocks are set up
const { processCheckout } = await import('@/lib/actions/checkout')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processCheckout', () => {
  it('throws when cart is empty', async () => {
    await expect(processCheckout([])).rejects.toThrow('Cart is empty')
  })

  it('throws when a cart item has quantity < 1', async () => {
    await expect(
      processCheckout([{ bookId: 'book-1', quantity: 0 }]),
    ).rejects.toThrow('Invalid cart item')
  })

  it('throws when a cart item has no bookId', async () => {
    await expect(
      processCheckout([{ bookId: '', quantity: 1 }]),
    ).rejects.toThrow('Invalid cart item')
  })

  it('throws when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    })

    await expect(
      processCheckout([{ bookId: 'book-1', quantity: 1 }]),
    ).rejects.toThrow('Authentication required')
  })

  it('captures price snapshot from books table, not from client', async () => {
    const userId = 'user-abc'
    const bookId = 'book-1'
    const serverPrice = 29.99
    const orderId = 'order-xyz'

    // Auth succeeds
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    })

    // Track what gets inserted into order_items
    let capturedOrderItems: Array<{ purchased_price: number }> = []

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: bookId, price: serverPrice }],
                error: null,
              }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: orderId },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'order_items') {
        return {
          insert: (items: Array<{ purchased_price: number }>) => {
            capturedOrderItems = items
            return Promise.resolve({ error: null })
          },
        }
      }
      return {}
    })

    const result = await processCheckout([{ bookId, quantity: 2 }])

    // Verify the price snapshot
    expect(capturedOrderItems).toHaveLength(1)
    expect(capturedOrderItems[0].purchased_price).toBe(serverPrice)

    // Verify total is computed from server price, not client
    expect(result.totalAmount).toBe(serverPrice * 2)
    expect(result.orderId).toBe(orderId)
  })

  it('computes total from multiple items with different prices', async () => {
    const userId = 'user-abc'
    const orderId = 'order-multi'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    })

    let capturedOrderItems: Array<{ purchased_price: number; quantity: number }> = []

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { id: 'book-a', price: 10.00 },
                  { id: 'book-b', price: 25.50 },
                ],
                error: null,
              }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: orderId },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'order_items') {
        return {
          insert: (items: Array<{ purchased_price: number; quantity: number }>) => {
            capturedOrderItems = items
            return Promise.resolve({ error: null })
          },
        }
      }
      return {}
    })

    const result = await processCheckout([
      { bookId: 'book-a', quantity: 3 },
      { bookId: 'book-b', quantity: 1 },
    ])

    // Verify each item captured the correct server price
    expect(capturedOrderItems[0].purchased_price).toBe(10.00)
    expect(capturedOrderItems[1].purchased_price).toBe(25.50)

    // Total = (10.00 * 3) + (25.50 * 1) = 55.50
    expect(result.totalAmount).toBe(55.50)
  })

  it('throws when a book is not found in the database', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        }
      }
      return {}
    })

    await expect(
      processCheckout([{ bookId: 'nonexistent', quantity: 1 }]),
    ).rejects.toThrow('One or more books not found')
  })
})
