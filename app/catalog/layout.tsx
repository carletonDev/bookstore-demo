import { Heading } from "@/components/heading";
import { Button } from "@/components/button";
import { signOut } from "@/lib/actions/auth";

/**
 * Catalog layout — Catalyst SidebarLayout shell.
 * Wraps the catalog page with a top navigation bar and a sidebar region.
 * The sidebar content (genre filters, format toggle) is rendered by the
 * page component and passed via the layout's children slot.
 */
export default function CatalogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Heading level={3}>Bookstore</Heading>
          <form action={signOut}>
            <Button plain type="submit" className="text-xs">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
