// ============================================================
// Carousa-AI: /api/slides/reorder — POST reorder slides
// ============================================================
// Updates the index of multiple slides in a project to reflect
// a new ordering. Validates that:
//   1. The project is owned by the authenticated user.
//   2. The provided indexes form a valid permutation of {0, 1, ..., N-1}.
//
// Requirements: 5.4
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import {
  getProjectById,
  getSlidesByProject,
  updateSlideOrder,
} from "@/lib/db/queries";

// ── Helpers ──────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function errorResponse(
  error: string,
  code: string,
  status: number,
): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

interface ReorderEntry {
  id: string;
  index: number;
}

interface ReorderBody {
  projectId: string;
  slides: ReorderEntry[];
}

/**
 * Validates that the provided index list is a valid permutation of {0, 1, ..., N-1}.
 * Returns true if valid, false otherwise.
 */
function isValidPermutation(slides: ReorderEntry[]): boolean {
  const n = slides.length;
  const indexes = slides.map((s) => s.index);
  const sorted = [...indexes].sort((a, b) => a - b);
  return sorted.every((val, i) => val === i);
}

// ── POST /api/slides/reorder ─────────────────────────────────

/**
 * Reorders slides within a project by updating each slide's index.
 *
 * Body: { projectId: string; slides: Array<{ id: string; index: number }> }
 *
 * Requirements: 5.4
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Body permintaan tidak valid.", "BAD_REQUEST", 400);
  }

  const { projectId, slides } = (body ?? {}) as Partial<ReorderBody>;

  // Validate required fields
  if (!projectId || typeof projectId !== "string") {
    return errorResponse("Field 'projectId' wajib diisi.", "BAD_REQUEST", 400);
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    return errorResponse(
      "Field 'slides' harus berupa array yang tidak kosong.",
      "BAD_REQUEST",
      400,
    );
  }

  // Validate each entry has id (string) and index (non-negative integer)
  const isValidEntries = slides.every(
    (s) =>
      s &&
      typeof s.id === "string" &&
      typeof s.index === "number" &&
      Number.isInteger(s.index) &&
      s.index >= 0,
  );

  if (!isValidEntries) {
    return errorResponse(
      "Setiap slide harus memiliki 'id' (string) dan 'index' (integer >= 0).",
      "BAD_REQUEST",
      400,
    );
  }

  // Validate that indexes form a valid permutation of {0, 1, ..., N-1}
  if (!isValidPermutation(slides)) {
    return errorResponse(
      "Index slide harus membentuk permutasi valid dari {0, 1, ..., N-1}.",
      "BAD_REQUEST",
      400,
    );
  }

  try {
    const supabase = await createClient();

    // Validate project ownership
    const project = await getProjectById(supabase, projectId, userId);
    if (!project) {
      return errorResponse(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
        "NOT_FOUND",
        404,
      );
    }

    // Validate that all provided slide IDs belong to this project
    const existingSlides = await getSlidesByProject(supabase, projectId);
    const existingIds = new Set(existingSlides.map((s) => s.id));
    const allBelong = slides.every((s) => existingIds.has(s.id));

    if (!allBelong) {
      return errorResponse(
        "Satu atau lebih slide tidak ditemukan dalam project ini.",
        "BAD_REQUEST",
        400,
      );
    }

    // Apply the reorder
    await updateSlideOrder(supabase, slides);

    // Return the updated slides ordered by new index
    const updatedSlides = await getSlidesByProject(supabase, projectId);
    return NextResponse.json({ slides: updatedSlides });
  } catch {
    return errorResponse(
      "Gagal memperbarui urutan slide.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
