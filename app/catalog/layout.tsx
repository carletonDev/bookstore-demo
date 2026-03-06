import { redirect } from "next/navigation";
import Link from "next/link";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { signOut } from "@/lib/actions/auth";
import { getCurrentUserProfile } from "@/lib/utils/currentUserProfile";

/**
 * Catalog layout — Catalyst SidebarLayout shell.
 *
 * Server Component that fetches the user profile for the welcome message
 * and renders the sidebar navigation with Sign Out.
 */
export default async function CatalogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 lg:flex lg:flex-col">
        <div className="flex h-full flex-col px-4 py-6">
          {/* Brand */}
          <div className="mb-8">
            <Heading level={3}>The Codex</Heading>
            <Text className="mt-1 text-xs">Your personal library</Text>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 space-y-1">
            <Link
              href="/catalog"
              className="block rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
            >
              The Library
            </Link>
            <Link
              href="/orders"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
            >
              Order History
            </Link>
            <Link
              href="/reports"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
            >
              Reports
            </Link>
          </nav>

          {/* Sign Out */}
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <form action={signOut}>
              <Button
                plain
                type="submit"
                className="w-full justify-start text-xs"
              >
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Heading level={3} className="lg:hidden">
              The Codex
            </Heading>
            <Text className="text-sm">
              Welcome,{" "}
              <span className="font-medium text-zinc-950 dark:text-white">
                {profile.fullName}
              </span>
            </Text>
            <form action={signOut} className="lg:hidden">
              <Button plain type="submit" className="text-xs">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
