// ============================================================
// Carousa-AI: /api/themes — GET all themes
// ============================================================
// Returns the list of available themes. Requires authentication.
// Themes are global (not user-scoped) but the endpoint still
// requires a valid session to prevent unauthenticated enumeration.
//
// Requirements: 3.1
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { getThemes } from "@/lib/db/queries";

function errorResponse(
  error: string,
  code: string,
  status: number,
): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Tidak terautentikasi.", "UNAUTHORIZED", 401);
  }

  try {
    const themes = await getThemes(supabase);
    return NextResponse.json({ themes });
  } catch {
    return errorResponse("Gagal mengambil daftar tema.", "INTERNAL_ERROR", 500);
  }
}
