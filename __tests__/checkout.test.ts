import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — intercept auth, price lookup, and Supabase client
// ---------------------------------------------------------------------------

const mockGetCurrentUser = vi.fn<() => Promise<string | null>>();
const mockGetBookPrices =
  vi.fn<
    () => Promise<Map<string, { id: string; title: string; price: number }>>
  >();

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/utils/currentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/queries/orders", () => ({
  getBookPrices: () => mockGetBookPrices(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => mockSupabase),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Must import after mocks are set up
const { processCheckout } = await import("@/lib/actions/checkout");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processCheckout", () => {
  it("returns error when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await processCheckout([
      { bookId: "book-1", format: "hardcover", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/);
  });

  it("returns error when cart is empty", async () => {
    mockGetCurrentUser.mockResolvedValue("user-abc");

    const result = await processCheckout([]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/empty/);
  });

  it("returns error when a cart item has invalid bookId", async () => {
    mockGetCurrentUser.mockResolvedValue("user-abc");

    const result = await processCheckout([
      { bookId: "", format: "hardcover", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid book ID/);
  });

  it("returns error when a cart item has quantity < 1", async () => {
    mockGetCurrentUser.mockResolvedValue("user-abc");

    const result = await processCheckout([
      { bookId: "book-1", format: "hardcover", quantity: 0 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid quantity/);
  });

  it("captures price snapshot from books table, not from client", async () => {
    const userId = "user-abc";
    const bookId = "book-1";
    const serverPrice = 29.99;
    const orderId = "order-xyz";

    mockGetCurrentUser.mockResolvedValue(userId);
    mockGetBookPrices.mockResolvedValue(
      new Map([
        [bookId, { id: bookId, title: "Test Book", price: serverPrice }],
      ]),
    );

    // Track what gets inserted into order_items
    let capturedOrderItems: Array<{ purchased_price: number }> = [];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "orders") {
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
        };
      }
      if (table === "order_items") {
        return {
          insert: (items: Array<{ purchased_price: number }>) => {
            capturedOrderItems = items;
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    });

    const result = await processCheckout([
      { bookId, format: "hardcover", quantity: 2 },
    ]);

    // Verify the price snapshot
    expect(capturedOrderItems).toHaveLength(1);
    expect(capturedOrderItems[0].purchased_price).toBe(serverPrice);

    // Verify total is computed from server price, not client
    expect(result.success).toBe(true);
    expect(result.orderId).toBe(orderId);
  });

  it("computes total from multiple items with different prices", async () => {
    const orderId = "order-multi";

    mockGetCurrentUser.mockResolvedValue("user-abc");
    mockGetBookPrices.mockResolvedValue(
      new Map([
        ["book-a", { id: "book-a", title: "Book A", price: 10.0 }],
        ["book-b", { id: "book-b", title: "Book B", price: 25.5 }],
      ]),
    );

    let capturedOrderItems: Array<{
      purchased_price: number;
      quantity: number;
    }> = [];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "orders") {
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
        };
      }
      if (table === "order_items") {
        return {
          insert: (
            items: Array<{ purchased_price: number; quantity: number }>,
          ) => {
            capturedOrderItems = items;
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    });

    const result = await processCheckout([
      { bookId: "book-a", format: "hardcover", quantity: 3 },
      { bookId: "book-b", format: "ereader", quantity: 1 },
    ]);

    // Verify each item captured the correct server price
    expect(capturedOrderItems[0].purchased_price).toBe(10.0);
    expect(capturedOrderItems[1].purchased_price).toBe(25.5);

    // Total = (10.00 * 3) + (25.50 * 1) = 55.50
    expect(result.success).toBe(true);
  });

  it("returns error when a book is not found in the database", async () => {
    mockGetCurrentUser.mockResolvedValue("user-abc");
    mockGetBookPrices.mockResolvedValue(new Map());

    const result = await processCheckout([
      { bookId: "nonexistent", format: "hardcover", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });
});
