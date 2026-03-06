"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/utils/currentUser";
import type { StarRating } from "@/types/database";

interface ReviewState {
  success: boolean;
  error: string | null;
}

const VALID_RATINGS = new Set<number>([1, 2, 3, 4, 5]);

/**
 * Server Action: submitReview
 *
 * Command pattern — single responsibility: insert a review for the
 * authenticated user on a specific book.
 *
 * Handles the UNIQUE(book_id, user_id) constraint by catching the
 * Postgres unique violation error (code 23505) and returning a
 * user-friendly message.
 *
 * Relies on the O(1) database trigger (trg_book_rating_aggregates) to
 * update rating_sum, rating_count, and the GENERATED rating_avg column
 * on the books table — no application-layer aggregation needed.
 */
export async function submitReview(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const userId = await getCurrentUser();
  if (!userId) {
    return {
      success: false,
      error: "You must be signed in to submit a review.",
    };
  }

  const bookId = formData.get("bookId");
  const ratingRaw = formData.get("rating");

  if (typeof bookId !== "string" || !bookId.trim()) {
    return { success: false, error: "Missing book identifier." };
  }

  const ratingNum = Number(ratingRaw);
  if (!VALID_RATINGS.has(ratingNum)) {
    return { success: false, error: "Please select a rating between 1 and 5." };
  }

  const rating = ratingNum as StarRating;

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("reviews")
    .insert({ book_id: bookId, user_id: userId, rating });

  if (error) {
    // Postgres unique violation — user has already reviewed this book
    if (error.code === "23505") {
      return {
        success: false,
        error: "You have already reviewed this book.",
      };
    }
    return {
      success: false,
      error: "Failed to submit review. Please try again.",
    };
  }

  return { success: true, error: null };
}
