// ============================================================
// Carousa-AI: /api/project — GET (list) & POST (create)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getProjects, createProject } from "@/modules/project";
import { AuthorizationError, ValidationError } from "@/lib/utils/errors";
import type { CreateProjectInput } from "@/lib/db/types";

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

// ── GET /api/project ─────────────────────────────────────────

/**
 * Returns all projects owned by the authenticated user,
 * sorted by updated_at descending.
 *
 * Requirements: 2.1, 1.7
 */
export async function GET(): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  try {
    const projects = await getProjects(userId);
    return NextResponse.json({ projects });
  } catch {
    return errorResponse(
      "Gagal mengambil daftar project.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ── POST /api/project ────────────────────────────────────────

/**
 * Creates a new project for the authenticated user.
 *
 * Body: { name: string; theme_id: string | null; total_slides: number }
 *
 * Requirements: 2.3, 2.4, 3.4, 3.5, 1.7
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

  const { name, theme_id, total_slides } = body as Partial<CreateProjectInput>;

  if (name === undefined || total_slides === undefined) {
    return errorResponse(
      "Field 'name' dan 'total_slides' wajib diisi.",
      "BAD_REQUEST",
      400,
    );
  }

  try {
    const project = await createProject(userId, {
      name,
      theme_id: theme_id ?? null,
      total_slides,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(err.message, "VALIDATION_ERROR", 422);
    }
    return errorResponse("Gagal membuat project.", "INTERNAL_ERROR", 500);
  }
}
