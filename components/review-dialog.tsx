"use client";

import { useState, useActionState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogBody,
  DialogActions,
} from "@/components/dialog";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { Alert } from "@/components/alert";
import { submitReview } from "@/lib/actions/reviews";
import type { StarRating } from "@/types/database";

interface ReviewDialogProps {
  bookId: string;
  bookTitle: string;
}

const STARS: StarRating[] = [1, 2, 3, 4, 5];

/**
 * Client Component — collects a star rating via a Catalyst Dialog
 * and submits it using the submitReview Server Action.
 */
export function ReviewDialog({ bookId, bookTitle }: ReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<StarRating | null>(null);
  const [hoveredRating, setHoveredRating] = useState<StarRating | null>(null);

  const [state, formAction, isPending] = useActionState(submitReview, {
    success: false,
    error: null,
  });

  function handleOpen(): void {
    setSelectedRating(null);
    setOpen(true);
  }

  function handleClose(): void {
    setOpen(false);
  }

  const displayRating = hoveredRating ?? selectedRating;

  return (
    <>
      <Button outline onClick={handleOpen} className="text-xs px-3 py-1.5">
        Write a Review
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Review &ldquo;{bookTitle}&rdquo;</DialogTitle>

        <form action={formAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="rating" value={selectedRating ?? ""} />

          <DialogBody>
            {state.error && (
              <Alert variant="destructive" className="mb-4">
                {state.error}
              </Alert>
            )}

            {state.success && (
              <Alert variant="info" className="mb-4">
                Review submitted successfully!
              </Alert>
            )}

            <Text className="mb-3">Select your rating:</Text>

            {/* Star rating selector */}
            <div className="flex gap-1">
              {STARS.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="text-3xl transition-colors focus:outline-none"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <span
                    className={
                      displayRating && star <= displayRating
                        ? "text-amber-400"
                        : "text-zinc-300 dark:text-zinc-600"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>

            {selectedRating && (
              <Text className="mt-2 text-xs">
                You selected {selectedRating} star
                {selectedRating > 1 ? "s" : ""}
              </Text>
            )}
          </DialogBody>

          <DialogActions>
            <Button plain onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedRating || isPending}>
              {isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
