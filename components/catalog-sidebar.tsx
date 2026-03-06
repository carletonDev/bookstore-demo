import Link from "next/link";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import type { Genre, BookFormat } from "@/types/database";

interface CatalogSidebarProps {
  genres: Genre[];
  activeGenre: string | undefined;
  activeFormat: BookFormat | undefined;
  searchQuery: string | undefined;
}

const FORMATS: { value: BookFormat; label: string }[] = [
  { value: "hardcover", label: "Hardcover" },
  { value: "softcover", label: "Softcover" },
  { value: "audiobook", label: "Audiobook" },
  { value: "ereader", label: "E-reader" },
];

function buildFilterUrl(params: {
  genre?: string;
  format?: string;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.genre) sp.set("genre", params.genre);
  if (params.format) sp.set("format", params.format);
  const qs = sp.toString();
  return `/catalog${qs ? `?${qs}` : ""}`;
}

/**
 * Sidebar filters for the catalog page.
 * Server Component — renders genre links and format toggles
 * that navigate via URL params (no client state needed).
 */
export function CatalogSidebar({
  genres,
  activeGenre,
  activeFormat,
  searchQuery,
}: CatalogSidebarProps) {
  return (
    <nav className="space-y-8">
      {/* Genre filters */}
      <div>
        <Heading level={4} className="mb-3">
          Genre
        </Heading>
        <ul className="space-y-1">
          <li>
            <Link
              href={buildFilterUrl({ q: searchQuery, format: activeFormat })}
              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                !activeGenre
                  ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
              }`}
            >
              All Genres
            </Link>
          </li>
          {genres.map((genre) => (
            <li key={genre.id}>
              <Link
                href={buildFilterUrl({
                  genre: genre.slug,
                  q: searchQuery,
                  format: activeFormat,
                })}
                className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeGenre === genre.slug
                    ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                }`}
              >
                {genre.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Format toggle */}
      <div>
        <Heading level={4} className="mb-3">
          Format
        </Heading>
        <ul className="space-y-1">
          <li>
            <Link
              href={buildFilterUrl({ genre: activeGenre, q: searchQuery })}
              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                !activeFormat
                  ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
              }`}
            >
              All Formats
            </Link>
          </li>
          {FORMATS.map((f) => (
            <li key={f.value}>
              <Link
                href={buildFilterUrl({
                  genre: activeGenre,
                  format: f.value,
                  q: searchQuery,
                })}
                className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeFormat === f.value
                    ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                }`}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Text className="text-xs">Use filters above to narrow results.</Text>
    </nav>
  );
}
