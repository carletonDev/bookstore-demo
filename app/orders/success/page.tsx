import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { getCurrentUser } from "@/lib/utils/currentUser";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function OrderSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const orderId = params.orderId;

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
      <Alert variant="info">Your order has been placed successfully!</Alert>

      <Heading level={1}>Thank You for Your Purchase</Heading>

      {orderId && (
        <Text>
          Order ID:{" "}
          <span className="font-medium text-zinc-950 dark:text-white">
            {orderId.slice(0, 8)}...
          </span>
        </Text>
      )}

      <Text>
        Your order is being processed. You can view your order history at any
        time.
      </Text>

      <div className="flex items-center justify-center gap-4 pt-4">
        <Link href="/catalog">
          <Button>Back to Catalog</Button>
        </Link>
        <Link href="/orders">
          <Button outline>View Orders</Button>
        </Link>
      </div>
    </main>
  );
}
