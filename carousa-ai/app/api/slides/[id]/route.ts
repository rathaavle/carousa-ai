// ============================================================
// Carousa-AI: /api/slides/[id] — PATCH update a single slide
// ============================================================
// Updates text, emotion, and/or scene fields of a slide.
// Validates that the slide's parent project is owned by the
// authenticated user before applying any changes.
//
// Requirements: 5.2, 5.3, 5.4
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getProjectById, updateSlide } from "@/lib/db/queries";
import type { UpdateSlideInput } from "@/lib/db/types";

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

type RouteContext = { params: Promise<{ id: string }> };

// ── PATCH /api/slides/[id] ───────────────────────────────────

/**
 * Partially updates a slide's text, emotion, and/or scene fields.
 * Ownership of the slide's parent project is verified before any update.
 *
 * Body: { text?: string | null; emotion?: string | null; scene?: string | null }
 *
 * Requirements: 5.2, 5.3, 5.4
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Body permintaan tidak valid.", "BAD_REQUEST", 400);
  }

  const { text, emotion, scene } = (body ?? {}) as Partial<
    Pick<UpdateSlideInput, "text" | "emotion" | "scene">
  >;

  // Ensure at least one field is provided
  if (text === undefined && emotion === undefined && scene === undefined) {
    return errorResponse(
      "Setidaknya satu field (text, emotion, scene) harus disertakan.",
      "BAD_REQUEST",
      400,
    );
  }

  try {
    const supabase = await createClient();

    // Fetch the slide to get its project_id for ownership validation
    const { data: slideData, error: slideFetchError } = await supabase
      .from("slides")
      .select("id, project_id")
      .eq("id", id)
      .single();

    if (slideFetchError || !slideData) {
      return errorResponse("Slide tidak ditemukan.", "NOT_FOUND", 404);
    }

    // Validate that the slide's project belongs to the authenticated user
    const project = await getProjectById(
      supabase,
      slideData.project_id,
      userId,
    );
    if (!project) {
      return errorResponse(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
        "NOT_FOUND",
        404,
      );
    }

    // Build the update payload with only the provided fields
    const updatePayload: UpdateSlideInput = {};
    if (text !== undefined) updatePayload.text = text;
    if (emotion !== undefined) updatePayload.emotion = emotion;
    if (scene !== undefined) updatePayload.scene = scene;

    const updatedSlide = await updateSlide(supabase, id, updatePayload);
    return NextResponse.json({ slide: updatedSlide });
  } catch {
    return errorResponse("Gagal memperbarui slide.", "INTERNAL_ERROR", 500);
  }
}
