// ============================================================
// Carousa-AI: /api/ai/generate-story — POST
// ============================================================
// Generates a full storyline for a project by calling
// CarouselModule.generateStoryline(). Returns the resulting
// slides so the client can redirect to the editor.
//
// Requirements: 4.4, 4.5, 4.6
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { CarouselModule } from "@/modules/carousel";
import {
  AuthorizationError,
  AIGenerationError,
  ValidationError,
} from "@/lib/utils/errors";

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

// ── POST /api/ai/generate-story ───────────────────────────────

/**
 * Generates a storyline for the given project and returns the
 * resulting slides. The client should disable the trigger button
 * while awaiting this response (Requirements 4.5).
 *
 * Body: { projectId: string }
 *
 * Success (200): { slides: Slide[], status: "success" }
 * Error  (400/401/403/500): { error: string, code: string }
 *
 * Requirements: 4.4, 4.5, 4.6
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Validate authentication
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Body permintaan tidak valid.", "BAD_REQUEST", 400);
  }

  const { projectId } = (body ?? {}) as { projectId?: unknown };

  if (!projectId || typeof projectId !== "string" || projectId.trim() === "") {
    return errorResponse(
      "Field 'projectId' wajib diisi dan harus berupa string.",
      "BAD_REQUEST",
      400,
    );
  }

  // 3. Generate storyline via CarouselModule
  try {
    const carousel = new CarouselModule();
    const slides = await carousel.generateStoryline(projectId.trim(), userId);

    // 4. Return slides on success (Requirements 4.6)
    return NextResponse.json({ slides, status: "success" }, { status: 200 });
  } catch (err) {
    // AuthorizationError — user does not own the project (Requirements 4.4)
    if (err instanceof AuthorizationError) {
      return errorResponse(
        "Anda tidak memiliki akses ke project ini.",
        "FORBIDDEN",
        403,
      );
    }

    // AIGenerationError — Gemini returned an error; already logged to
    // Generation_Record inside AI_Orchestrator (Requirements 4.4)
    if (err instanceof AIGenerationError) {
      console.error(
        `[generate-story] AIGenerationError (generationId=${err.generationId}):`,
        err.message,
      );
      return errorResponse(
        "Gagal menghasilkan storyline. Silakan coba lagi.",
        "AI_GENERATION_ERROR",
        500,
      );
    }

    // ValidationError — invalid input detected deeper in the call stack
    if (err instanceof ValidationError) {
      return errorResponse(err.message, "VALIDATION_ERROR", 400);
    }

    // Unknown / unexpected errors — log but do not expose details
    console.error("[generate-story] Unexpected error:", err);
    return errorResponse(
      "Terjadi kesalahan internal. Silakan coba lagi.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
