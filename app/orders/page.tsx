import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from "@/components/description-list";
import { getCurrentUser } from "@/lib/utils/currentUser";
import { getOrderHistory } from "@/lib/queries/orders";
import type { OrderWithItems } from "@/types/database";

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

export default async function OrdersPage() {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }

  const orders = await getOrderHistory(userId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      <Link href="/catalog">
        <Button outline>Back to Library</Button>
      </Link>
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

function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <Heading level={3}>Order {order.id.slice(0, 8)}...</Heading>
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
          {order.status}
        </span>
      </div>

      <DescriptionList>
        <DescriptionTerm>Date</DescriptionTerm>
        <DescriptionDetails>{formatDate(order.created_at)}</DescriptionDetails>

        <DescriptionTerm>Total</DescriptionTerm>
        <DescriptionDetails>
          {formatCurrency(order.total_amount)}
        </DescriptionDetails>

        <DescriptionTerm>Items</DescriptionTerm>
        <DescriptionDetails>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.book.title} x{item.quantity}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(item.purchased_price)} each
                </span>
              </li>
            ))}
          </ul>
        </DescriptionDetails>
      </DescriptionList>
    </div>
  );
}
