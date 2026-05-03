// ============================================================
// Carousa-AI: /api/ai/regenerate — POST
// ============================================================
// Regenerates the text or image for a single slide without
// affecting any other slides in the project.
//
// The client should disable the regeneration button for the
// slide being processed while awaiting this response, and
// re-enable it once the response is received (Requirements 8.6).
//
// Requirements: 8.5, 8.6
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

// ── POST /api/ai/regenerate ───────────────────────────────────

/**
 * Regenerates the text or image for a single slide.
 *
 * The client must disable the regeneration button for the target slide
 * while this request is in-flight and re-enable it on completion or
 * error (Requirements 8.6).
 *
 * On failure, the original slide content is preserved — the endpoint
 * returns an error response without modifying the slide (Requirements 8.5).
 *
 * Body: { slideId: string; type: "text" | "image" }
 *
 * Success (200):
 *   {
 *     slide: Slide,          // the updated slide
 *     generationId: string,  // audit record ID
 *     status: "success"
 *   }
 *
 * Error (400/401/403/500): { error: string, code: string }
 *
 * Requirements: 8.5, 8.6
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

  const { slideId, type } = (body ?? {}) as {
    slideId?: unknown;
    type?: unknown;
  };

  if (!slideId || typeof slideId !== "string" || slideId.trim() === "") {
    return errorResponse(
      "Field 'slideId' wajib diisi dan harus berupa string.",
      "BAD_REQUEST",
      400,
    );
  }

  if (type !== "text" && type !== "image") {
    return errorResponse(
      "Field 'type' harus bernilai 'text' atau 'image'.",
      "BAD_REQUEST",
      400,
    );
  }

  // 3. Regenerate the slide via CarouselModule
  try {
    const carousel = new CarouselModule();
    const result = await carousel.regenerateSlide(slideId.trim(), type, userId);

    // Return the updated slide and generation record ID on success
    return NextResponse.json(
      {
        slide: result.slide,
        generationId: result.generationId,
        status: "success",
      },
      { status: 200 },
    );
  } catch (err) {
    // AuthorizationError — slide or project not found / not owned by user
    if (err instanceof AuthorizationError) {
      return errorResponse(
        "Slide tidak ditemukan atau Anda tidak memiliki akses.",
        "FORBIDDEN",
        403,
      );
    }

    // AIGenerationError — provider returned an error; already logged to
    // Generation_Record inside AI_Orchestrator (Requirements 8.5)
    if (err instanceof AIGenerationError) {
      console.error(
        `[regenerate] AIGenerationError (generationId=${err.generationId}):`,
        err.message,
      );
      return errorResponse(
        type === "image"
          ? "Gagal meregenerasi gambar. Konten slide sebelumnya tetap dipertahankan. Silakan coba lagi."
          : "Gagal meregenerasi teks. Konten slide sebelumnya tetap dipertahankan. Silakan coba lagi.",
        "AI_GENERATION_ERROR",
        500,
      );
    }

    // ValidationError — invalid input detected deeper in the call stack
    if (err instanceof ValidationError) {
      return errorResponse(err.message, "VALIDATION_ERROR", 400);
    }

    // Unknown / unexpected errors — log but do not expose details
    console.error("[regenerate] Unexpected error:", err);
    return errorResponse(
      "Terjadi kesalahan internal. Silakan coba lagi.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
