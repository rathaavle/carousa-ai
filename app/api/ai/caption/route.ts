// ============================================================
// Carousa-AI: /api/ai/caption — POST
// ============================================================
// Generates an Instagram caption for a project based on all
// slide texts, via CarouselModule.generateCaption().
//
// On GeminiProvider failure the endpoint returns a structured
// error response so the client can display a message and allow
// the user to retry without losing any slide data (Req. 10.5).
//
// Requirements: 10.1, 10.2, 10.5
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

// ── POST /api/ai/caption ──────────────────────────────────────

/**
 * Generates an Instagram caption for the given project.
 *
 * The caption includes a narrative summary, a CTA, and at least
 * 10 relevant hashtags (Requirements 10.1, 10.2).
 *
 * On failure, the endpoint returns a descriptive error so the
 * client can display a message and allow the user to retry
 * without losing any slide data (Requirements 10.5).
 *
 * Body: { projectId: string }
 *
 * Success (200):
 *   {
 *     caption: string,   // ready-to-copy Instagram caption
 *     status: "success"
 *   }
 *
 * Error (400/401/403/500): { error: string, code: string }
 *
 * Requirements: 10.1, 10.2, 10.5
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

  // 3. Generate caption via CarouselModule
  try {
    const carousel = new CarouselModule();
    const caption = await carousel.generateCaption(projectId.trim(), userId);

    // Return the caption on success (Requirements 10.1, 10.2)
    return NextResponse.json({ caption, status: "success" }, { status: 200 });
  } catch (err) {
    // AuthorizationError — user does not own the project
    if (err instanceof AuthorizationError) {
      return errorResponse(
        "Anda tidak memiliki akses ke project ini.",
        "FORBIDDEN",
        403,
      );
    }

    // AIGenerationError — Gemini returned an error or no slide texts exist.
    // The error is already logged to Generation_Record inside AI_Orchestrator.
    // Return a user-friendly message so the client can display it and allow
    // retry without losing slide data (Requirements 10.5).
    if (err instanceof AIGenerationError) {
      console.error(
        `[caption] AIGenerationError (generationId=${err.generationId}):`,
        err.message,
      );

      // Distinguish "no slide texts" from a provider failure for a clearer UX
      const isNoContent = err.message.includes("tidak ada teks slide");
      return errorResponse(
        isNoContent
          ? "Tidak ada teks slide yang tersedia. Hasilkan storyline terlebih dahulu sebelum membuat caption."
          : "Gagal menghasilkan caption. Silakan coba lagi — data slide Anda tidak akan hilang.",
        "AI_GENERATION_ERROR",
        isNoContent ? 422 : 500,
      );
    }

    // ValidationError — invalid input detected deeper in the call stack
    if (err instanceof ValidationError) {
      return errorResponse(err.message, "VALIDATION_ERROR", 400);
    }

    // Unknown / unexpected errors — log but do not expose details
    console.error("[caption] Unexpected error:", err);
    return errorResponse(
      "Terjadi kesalahan internal. Silakan coba lagi.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
