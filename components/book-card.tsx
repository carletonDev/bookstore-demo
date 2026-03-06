import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";
import type { BookCatalogItemWithRelations } from "@/types/database";

interface BookCardProps {
  book: BookCatalogItemWithRelations;
}

function formatAuthors(
  authors: Pick<
    { id: string; first_name: string; last_name: string },
    "first_name" | "last_name"
  >[],
): string {
  if (authors.length === 0) return "Unknown Author";
  return authors.map((a) => `${a.first_name} ${a.last_name}`).join(", ");
}

function formatRating(avg: number | null): string {
  if (avg === null) return "No ratings";
  return avg.toFixed(1);
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * BookCard — displays a book in the catalog grid.
 * Uses Catalyst Heading, Text, and Badge components.
 * Displays rating_avg prominently as a 1-decimal Badge.
 *
 * Server Component — no client interactivity needed for the card itself.
 */
export function BookCard({ book }: BookCardProps) {
  const ratingDisplay = formatRating(book.rating_avg);
  const hasRating = book.rating_avg !== null;

  return (
    <article className="group rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10 overflow-hidden transition-shadow hover:shadow-md">
      {/* Cover image placeholder */}
      {book.cover_image_url ? (
        <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
          <img
            src={book.cover_image_url}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
          <Text className="text-zinc-400 dark:text-zinc-500 text-xs">
            No Cover
          </Text>
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Title */}
        <Heading level={4} className="line-clamp-2">
          {book.title}
        </Heading>

        {/* Author(s) */}
        <Text className="text-xs line-clamp-1">
          {formatAuthors(book.authors)}
        </Text>

        {/* Rating — prominent display */}
        <div className="flex items-center gap-2">
          <Badge color={hasRating ? "amber" : "zinc"}>
            {hasRating ? `★ ${ratingDisplay}` : ratingDisplay}
          </Badge>
          {hasRating && (
            <Text className="text-xs">
              ({book.rating_count}{" "}
              {book.rating_count === 1 ? "review" : "reviews"})
            </Text>
          )}
        </div>

        {/* Price + Genres */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            {formatPrice(book.price)}
          </span>
          <div className="flex gap-1 flex-wrap justify-end">
            {book.genres.slice(0, 2).map((genre) => (
              <Badge key={genre.id} color="blue" className="text-[10px]">
                {genre.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
