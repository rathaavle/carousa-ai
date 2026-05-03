// ============================================================
// Carousa-AI: Slide Utility Functions
// ============================================================
// Pure utility functions for slide ordering logic, plus a
// database helper to persist reordered indexes.
//
// Requirements: 5.4
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Slide } from "@/lib/db/types";
import { updateSlideOrder } from "@/lib/db/queries";

// ── Pure reorder logic ────────────────────────────────────────

/**
 * Moves the slide at `fromIndex` to `toIndex` within the array and
 * reassigns every slide's `index` property so the result is always
 * a valid permutation of {0, 1, …, N-1}.
 *
 * Edge-case handling:
 * - Same index → returns a new array with indexes normalised (no-op move).
 * - Out-of-bounds indexes are clamped to [0, slides.length - 1].
 * - Empty array → returns [].
 *
 * This is a pure function: it never mutates the input array or its
 * elements, and it makes no database calls.
 *
 * Requirements: 5.4
 */
export function reorderSlides(
  slides: Slide[],
  fromIndex: number,
  toIndex: number,
): Slide[] {
  if (slides.length === 0) return [];

  const lastIdx = slides.length - 1;

  // Clamp both indexes to valid range
  const from = Math.max(0, Math.min(fromIndex, lastIdx));
  const to = Math.max(0, Math.min(toIndex, lastIdx));

  // Build a shallow copy of the array
  const reordered = [...slides];

  // Splice the element out and insert it at the target position
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  // Reassign index properties so they form {0, 1, …, N-1}
  return reordered.map((slide, i) => ({ ...slide, index: i }));
}

// ── Database persistence ──────────────────────────────────────

/**
 * Persists a new slide ordering to the database.
 *
 * Accepts an array of `{ id, index }` pairs and updates every slide
 * in a single batch operation (parallel individual updates via
 * `Promise.all`). Delegates to the `updateSlideOrder` query helper
 * which already handles the Supabase calls.
 *
 * Throws if any individual update fails.
 *
 * Requirements: 5.4
 */
export async function applyReorderToDatabase(
  supabase: SupabaseClient,
  slides: Array<{ id: string; index: number }>,
): Promise<void> {
  await updateSlideOrder(supabase, slides);
}
