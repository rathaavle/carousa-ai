// ============================================================
// Carousa-AI: /api/project/[id] — GET (detail) & DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getProject, deleteProject } from "@/modules/project";
import { AuthorizationError } from "@/lib/utils/errors";

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

// ── GET /api/project/[id] ────────────────────────────────────

/**
 * Returns the detail of a single project owned by the authenticated user.
 *
 * Requirements: 2.3, 1.7
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  const { id } = await context.params;

  try {
    const project = await getProject(id, userId);
    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "NOT_FOUND", 404);
    }
    return errorResponse(
      "Gagal mengambil detail project.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ── DELETE /api/project/[id] ─────────────────────────────────

/**
 * Deletes a project (and all its slides / generation records via CASCADE)
 * after verifying ownership.
 *
 * Requirements: 2.6, 1.7
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  const { id } = await context.params;

  try {
    await deleteProject(id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "NOT_FOUND", 404);
    }
    return errorResponse("Gagal menghapus project.", "INTERNAL_ERROR", 500);
  }
}
