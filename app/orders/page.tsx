import { redirect } from "next/navigation";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/table";
import { getCurrentUser } from "@/lib/utils/currentUser";
import { getOrderHistory } from "@/lib/queries/orders";
import type { OrderWithItems, OrderStatus } from "@/types/database";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const STATUS_COLORS: Record<
  OrderStatus,
  "zinc" | "green" | "amber" | "blue" | "red"
> = {
  pending: "amber",
  confirmed: "blue",
  shipped: "purple" as "blue",
  delivered: "green",
  cancelled: "red",
};

export default async function OrdersPage() {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }

  const orders = await getOrderHistory(userId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <Heading level={1}>Order History</Heading>

      {orders.length === 0 ? (
        <Text>You have no previous orders.</Text>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
  );
}

/**
 * OrderCard — displays a single order with its line items in a Table.
 *
 * Senior Requirement: Displays purchased_price from the snapshot,
 * not the live book price, preserving historical data integrity.
 */
function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <Heading level={3}>Order {order.id.slice(0, 8)}...</Heading>
        <Badge color={STATUS_COLORS[order.status] ?? "zinc"}>
          {order.status}
        </Badge>
      </div>

      <Text className="text-xs">{formatDate(order.created_at)}</Text>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Book</TableHeader>
            <TableHeader className="text-right">Qty</TableHeader>
            <TableHeader className="text-right">Price at Purchase</TableHeader>
            <TableHeader className="text-right">Line Total</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.book.title}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.purchased_price)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.purchased_price * item.quantity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <Text className="font-semibold">
          Total: {formatCurrency(order.total_amount)}
        </Text>
      </div>
    </div>
  );
}
