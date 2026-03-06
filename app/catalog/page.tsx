import { redirect } from "next/navigation";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { BookCard } from "@/components/book-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CatalogSidebar } from "@/components/catalog-sidebar";
import { ReviewDialog } from "@/components/review-dialog";
import { getBooks } from "@/lib/queries/books";
import { getGenres } from "@/lib/queries/genres";
import { getUserStats } from "@/lib/queries/userStats";
import { getCurrentUser } from "@/lib/utils/currentUser";
import type { BookFormat } from "@/types/database";
import Link from "next/link";

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    cursor?: string;
  }>;
}

const VALID_FORMATS = new Set<string>([
  "hardcover",
  "softcover",
  "audiobook",
  "ereader",
]);

/**
 * Catalog page — Server Component.
 * Handles q (search), genre (filter), format (filter), and cursor (pagination)
 * URL parameters. Fetches books via the getBooks() facade.
 *
 * Authorization: getCurrentUser() is checked — if null, redirect to /login.
 * (Also enforced at the proxy level for defense in depth.)
 */
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;

  const query = params.q?.trim() || undefined;
  const genreSlug = params.genre || undefined;
  const format =
    params.format && VALID_FORMATS.has(params.format)
      ? (params.format as BookFormat)
      : undefined;
  const cursor = params.cursor || undefined;

  const [result, genres, stats] = await Promise.all([
    getBooks({ query, genreSlug, format, cursor }),
    getGenres(),
    getUserStats(userId),
  ]);

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <CatalogSidebar
          genres={genres}
          activeGenre={genreSlug}
          activeFormat={format}
          searchQuery={query}
        />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Quick Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-xs">Books Purchased</Text>
            <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
              {stats.booksPurchased}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <Text className="text-xs">Recent Reviews</Text>
            <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
              {stats.recentReviewCount}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <form action="/catalog" method="get" className="mb-6">
          {genreSlug && <input type="hidden" name="genre" value={genreSlug} />}
          {format && <input type="hidden" name="format" value={format} />}
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by title or author..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
            />
            <Button type="submit">Search</Button>
          </div>
        </form>

        {/* Results header */}
        <div className="mb-4 flex items-center justify-between">
          <Heading level={2}>
            {query ? `Results for "${query}"` : "Book Catalog"}
          </Heading>
          <Text className="text-xs">
            {result.data.length} book{result.data.length !== 1 ? "s" : ""} shown
          </Text>
        </div>

        {/* Book grid */}
        {result.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <Text>No books found. Try adjusting your filters.</Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {result.data.map((book) => (
              <div key={book.id} className="space-y-2">
                <BookCard book={book} />
                <div className="flex items-center justify-between gap-2">
                  <AddToCartButton
                    bookId={book.id}
                    formats={book.formats}
                  />
                  <ReviewDialog bookId={book.id} bookTitle={book.title} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {result.hasMore && result.nextCursor && (
          <div className="mt-8 flex justify-center">
            <Link
              href={buildPaginationUrl({
                q: query,
                genre: genreSlug,
                format,
                cursor: result.nextCursor,
              })}
            >
              <Button outline>Load More</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function buildPaginationUrl(params: {
  q?: string;
  genre?: string;
  format?: string;
  cursor: string;
}): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.genre) sp.set("genre", params.genre);
  if (params.format) sp.set("format", params.format);
  sp.set("cursor", params.cursor);
  return `/catalog?${sp.toString()}`;
}
