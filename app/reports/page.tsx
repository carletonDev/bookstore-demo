import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/table";
import { getGenreSales, aggregateGlobalStats } from "@/lib/queries/reports";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function ReportsPage() {
  const genreRows = await getGenreSales();
  const stats = aggregateGlobalStats(genreRows);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      {/* Global Sales Stats */}
      <section className="space-y-4">
        <Heading level={1}>Global Sales Stats</Heading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
          />
          <StatCard
            label="Units Sold"
            value={stats.totalUnitsSold.toLocaleString()}
          />
          <StatCard label="Orders" value={stats.totalOrders.toLocaleString()} />
        </div>
      </section>

      {/* Genre Breakdown */}
      <section className="space-y-4">
        <Heading level={2}>Genre Breakdown</Heading>
        {genreRows.length === 0 ? (
          <Text>No sales data available yet.</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Genre</TableHeader>
                <TableHeader className="text-right">Orders</TableHeader>
                <TableHeader className="text-right">Units Sold</TableHeader>
                <TableHeader className="text-right">Revenue</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {genreRows.map((row) => (
                <TableRow key={row.genre_id}>
                  <TableCell className="font-medium">
                    {row.genre_name}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(row.order_count).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(row.total_units_sold).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(row.total_revenue))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
      <Text>{label}</Text>
      <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
