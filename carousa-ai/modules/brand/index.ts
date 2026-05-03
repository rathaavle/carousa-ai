// ============================================================
// Carousa-AI: Brand Module
// ============================================================
// Handles all Brand Profile operations: fetching, saving (upsert),
// and toggling Style Lock. Enforces the one-brand-profile-per-user
// invariant via ON CONFLICT DO UPDATE (upsert) in the database layer.
// ============================================================

import { createClient } from "@/lib/db/server";
import {
  getBrandProfile as dbGetBrandProfile,
  upsertBrandProfile,
} from "@/lib/db/queries";
import { AuthorizationError } from "@/lib/utils/errors";
import type { BrandProfile, BrandProfileInput } from "@/lib/db/types";

// ============================================================
// Public API
// ============================================================

/**
 * Returns the Brand Profile for `userId`, or `null` if none exists yet.
 *
 * Requirements: 9.1, 9.2
 */
export async function getBrandProfile(
  userId: string,
): Promise<BrandProfile | null> {
  if (!userId) {
    throw new AuthorizationError("User ID wajib diisi.");
  }

  const supabase = await createClient();
  return dbGetBrandProfile(supabase, userId);
}

/**
 * Creates or updates the Brand Profile for `userId`.
 * Uses ON CONFLICT DO UPDATE (upsert) so there is always exactly one
 * Brand Profile per user — subsequent saves replace the existing record.
 *
 * Requirements: 9.2, 9.5, 9.6
 */
export async function saveBrandProfile(
  userId: string,
  data: BrandProfileInput,
): Promise<BrandProfile> {
  if (!userId) {
    throw new AuthorizationError("User ID wajib diisi.");
  }

  const supabase = await createClient();
  return upsertBrandProfile(supabase, userId, data);
}

/**
 * Activates or deactivates Style Lock for `userId`'s Brand Profile.
 * If no Brand Profile exists yet, creates a minimal one with the given
 * style_lock value so the toggle always succeeds.
 *
 * Requirements: 9.3, 9.4, 9.6
 */
export async function toggleStyleLock(
  userId: string,
  enabled: boolean,
): Promise<BrandProfile> {
  if (!userId) {
    throw new AuthorizationError("User ID wajib diisi.");
  }

  const supabase = await createClient();

  // Fetch existing profile (may be null for new users)
  const existing = await dbGetBrandProfile(supabase, userId);

  // Merge style_lock into existing data (or create a minimal profile)
  const profileData: BrandProfileInput = {
    color_palette: existing?.color_palette ?? null,
    lighting: existing?.lighting ?? null,
    texture: existing?.texture ?? null,
    character_style: existing?.character_style ?? null,
    style_lock: enabled,
  };

  return upsertBrandProfile(supabase, userId, profileData);
}
