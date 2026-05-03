// ============================================================
// Carousa-AI: /api/ai/generate-images — POST
// ============================================================
// Triggers batch image generation for all slides in a project.
// Processes slides sequentially and returns a progress summary
// that the client can use to update its UI.
//
// The client should disable the "Generate Images" button while
// awaiting this response and display a progress indicator
// showing {completed}/{total} slides (Requirements 7.4, 7.6).
//
// Requirements: 7.4, 7.6
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

// ── POST /api/ai/generate-images ──────────────────────────────

/**
 * Generates images for all slides in the given project.
 *
 * Slides are processed sequentially. Individual slide failures are
 * recorded but do not abort the batch (fail-gracefully, Req 7.3).
 *
 * Body: { projectId: string }
 *
 * Success (200):
 *   {
 *     completed: number,   // slides successfully processed
 *     failed: number,      // slides that failed
 *     total: number,       // total slides in the project
 *     slides: Slide[],     // updated slide data
 *     status: "success" | "partial"
 *   }
 *
 * Error (400/401/403/500): { error: string, code: string }
 *
 * Requirements: 7.4, 7.6
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

  // 3. Run batch image generation via CarouselModule
  try {
    const carousel = new CarouselModule();
    const result = await carousel.generateAllImages(projectId.trim(), userId);

    // Determine overall status:
    // - "success"  → all slides processed successfully
    // - "partial"  → some slides failed (fail-gracefully, Req 7.3)
    const status = result.failed === 0 ? "success" : "partial";

    // Return progress summary (Requirements 7.4, 7.6)
    return NextResponse.json(
      {
        completed: result.completed,
        failed: result.failed,
        total: result.total,
        slides: result.slides,
        status,
      },
      { status: 200 },
    );
  } catch (err) {
    // AuthorizationError — user does not own the project
    if (err instanceof AuthorizationError) {
      return errorResponse(
        "Anda tidak memiliki akses ke project ini.",
        "FORBIDDEN",
        403,
      );
    }

    // AIGenerationError — already logged to Generation_Record inside orchestrator
    if (err instanceof AIGenerationError) {
      console.error(
        `[generate-images] AIGenerationError (generationId=${err.generationId}):`,
        err.message,
      );
      return errorResponse(
        "Gagal menghasilkan gambar. Silakan coba lagi.",
        "AI_GENERATION_ERROR",
        500,
      );
    }

    // ValidationError — invalid input detected deeper in the call stack
    if (err instanceof ValidationError) {
      return errorResponse(err.message, "VALIDATION_ERROR", 400);
    }

    // Unknown / unexpected errors — log but do not expose details
    console.error("[generate-images] Unexpected error:", err);
    return errorResponse(
      "Terjadi kesalahan internal. Silakan coba lagi.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
