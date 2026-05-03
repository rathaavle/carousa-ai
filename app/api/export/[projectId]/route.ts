// ============================================================
// Carousa-AI: /api/export/[projectId] — GET (export as ZIP)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { exportProjectAsZip } from "@/modules/export";
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

type RouteContext = { params: Promise<{ projectId: string }> };

// ── GET /api/export/[projectId] ──────────────────────────────

/**
 * Exports all slide images for a project as a ZIP file.
 *
 * Query parameters:
 *   - confirm=true  (optional) — skip the warning check and proceed with
 *                                export even if some slides have no images.
 *
 * Behavior:
 *   1. Authenticate the user. Return 401 if not authenticated.
 *   2. Call exportProjectAsZip(projectId, userId).
 *   3. If slidesWithoutImages > 0 AND confirm !== "true":
 *      - Return 200 JSON with requiresConfirmation: true so the frontend
 *        can show a warning and re-call with ?confirm=true.
 *   4. Otherwise return the ZIP binary with appropriate headers.
 *
 * Requirements: 11.1, 11.3, 11.4
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  // ── 1. Authenticate ───────────────────────────────────────
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  const { projectId } = await context.params;
  const confirm = request.nextUrl.searchParams.get("confirm");

  try {
    // ── 2. Run export ─────────────────────────────────────────
    const result = await exportProjectAsZip(projectId, userId);

    const {
      zipBuffer,
      filename,
      totalSlides,
      slidesWithImages,
      slidesWithoutImages,
    } = result;

    // ── 3. Confirmation required? ─────────────────────────────
    // Requirement 11.3: warn the user if some slides have no images
    if (slidesWithoutImages > 0 && confirm !== "true") {
      return NextResponse.json(
        {
          requiresConfirmation: true,
          slidesWithoutImages,
          totalSlides,
          slidesWithImages,
          message: `${slidesWithoutImages} dari ${totalSlides} slide tidak memiliki gambar dan akan dilewati. Lanjutkan ekspor?`,
        },
        { status: 200 },
      );
    }

    // ── 4. Return ZIP binary ──────────────────────────────────
    // Requirement 11.1: download all generated slide images as a ZIP file
    // Convert Buffer to Uint8Array for BodyInit compatibility
    const zipUint8Array = new Uint8Array(zipBuffer);
    return new Response(zipUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    // ── 5. Handle AuthorizationError → 403 ───────────────────
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "FORBIDDEN", 403);
    }

    // ── 6. Handle other errors → 500 ─────────────────────────
    console.error("[export-route] Gagal mengekspor project:", err);
    return errorResponse("Gagal mengekspor project.", "INTERNAL_ERROR", 500);
  }
}
