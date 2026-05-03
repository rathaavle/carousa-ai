// ============================================================
// Carousa-AI: /api/brand — GET, POST, PATCH brand profile
// ============================================================
// All endpoints require an authenticated session. Ownership is
// enforced by scoping every operation to the authenticated user's
// ID — users can only read/write their own Brand Profile.
//
// Requirements: 9.1, 9.2, 9.3
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import {
  getBrandProfile,
  saveBrandProfile,
  toggleStyleLock,
} from "@/modules/brand";
import { AuthorizationError } from "@/lib/utils/errors";
import type { BrandProfileInput } from "@/lib/db/types";

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

// ── GET /api/brand ────────────────────────────────────────────

/**
 * Returns the Brand Profile for the authenticated user.
 * Returns `{ profile: null }` if no profile has been created yet.
 *
 * Requirements: 9.1, 9.2
 */
export async function GET(): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  try {
    const profile = await getBrandProfile(userId);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(
      "Gagal mengambil brand profile.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ── POST /api/brand ───────────────────────────────────────────

/**
 * Creates or replaces the Brand Profile for the authenticated user.
 * Uses upsert semantics — always results in exactly one profile per user.
 *
 * Body: BrandProfileInput (all fields optional, style_lock defaults to false)
 *
 * Requirements: 9.2, 9.5
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

  const {
    color_palette = null,
    lighting = null,
    texture = null,
    character_style = null,
    style_lock = false,
  } = (body ?? {}) as Partial<BrandProfileInput>;

  try {
    const profile = await saveBrandProfile(userId, {
      color_palette,
      lighting,
      texture,
      character_style,
      style_lock,
    });
    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(
      "Gagal menyimpan brand profile.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ── PATCH /api/brand ──────────────────────────────────────────

/**
 * Partially updates the Brand Profile for the authenticated user.
 * Merges the provided fields with the existing profile.
 * Supports toggling Style Lock via `{ style_lock: boolean }`.
 *
 * Body: Partial<BrandProfileInput>
 *
 * Requirements: 9.3, 9.4, 9.6
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const patch = (body ?? {}) as Partial<BrandProfileInput>;

  try {
    // If only style_lock is being toggled, use the dedicated toggle helper
    // which handles the case where no profile exists yet.
    if (
      typeof patch.style_lock === "boolean" &&
      Object.keys(patch).length === 1
    ) {
      const profile = await toggleStyleLock(userId, patch.style_lock);
      return NextResponse.json({ profile });
    }

    // Otherwise fetch the existing profile and merge the patch
    const existing = await getBrandProfile(userId);

    const merged: BrandProfileInput = {
      color_palette: patch.color_palette ?? existing?.color_palette ?? null,
      lighting: patch.lighting ?? existing?.lighting ?? null,
      texture: patch.texture ?? existing?.texture ?? null,
      character_style:
        patch.character_style ?? existing?.character_style ?? null,
      style_lock: patch.style_lock ?? existing?.style_lock ?? false,
    };

    const profile = await saveBrandProfile(userId, merged);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return errorResponse(err.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(
      "Gagal memperbarui brand profile.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
