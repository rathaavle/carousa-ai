// ============================================================
// Carousa-AI: /api/slides/[projectId] — GET all slides for a project
// ============================================================
// Returns all slides belonging to a project, ordered by index ascending.
// Validates that the project is owned by the authenticated user before
// returning any data.
//
// Requirements: 5.2, 5.3, 5.4
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getProjectById, getSlidesByProject } from "@/lib/db/queries";

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

// ── GET /api/slides/project/[id] ─────────────────────────────

/**
 * Returns all slides for a project owned by the authenticated user,
 * ordered by index ascending.
 *
 * Requirements: 5.2, 5.3, 5.4
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  const { id: projectId } = await context.params;

  try {
    const supabase = await createClient();

    // Validate project ownership before returning slides
    const project = await getProjectById(supabase, projectId, userId);
    if (!project) {
      return errorResponse(
        "Project tidak ditemukan atau Anda tidak memiliki akses.",
        "NOT_FOUND",
        404,
      );
    }

    const slides = await getSlidesByProject(supabase, projectId);
    return NextResponse.json({ slides });
  } catch {
    return errorResponse(
      "Gagal mengambil daftar slide.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
