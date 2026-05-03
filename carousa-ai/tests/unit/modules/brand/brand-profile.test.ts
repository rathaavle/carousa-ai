// ============================================================
// Carousa-AI — Unit / Property-Based Tests: Brand Profile
// ============================================================
// Feature: carousa-ai, Property 13: Satu Brand Profile Per User
//
// Strategy: mock the db query helpers (getBrandProfile /
// upsertBrandProfile) and verify that the BrandModule always
// calls upsert (never insert-only), ensuring the one-profile-
// per-user invariant is upheld regardless of how many times
// saveBrandProfile is called.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { BrandProfile } from "@/lib/db/types";
import { AuthorizationError } from "@/lib/utils/errors";

// ── Mock db/server (createClient) ────────────────────────────────────────

vi.mock("@/lib/db/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

// ── Mock db/queries ───────────────────────────────────────────────────────

const mockGetBrandProfile = vi.fn();
const mockUpsertBrandProfile = vi.fn();

vi.mock("@/lib/db/queries", () => ({
  getBrandProfile: (...args: unknown[]) => mockGetBrandProfile(...args),
  upsertBrandProfile: (...args: unknown[]) => mockUpsertBrandProfile(...args),
}));

// Import AFTER mocks are registered
import {
  getBrandProfile,
  saveBrandProfile,
  toggleStyleLock,
} from "@/modules/brand";

// ── Helpers ────────────────────────────────────────────────────────────────

let profileIdCounter = 0;

function makeBrandProfile(
  userId: string,
  overrides: Partial<BrandProfile> = {},
): BrandProfile {
  return {
    id: `bp-${++profileIdCounter}`,
    user_id: userId,
    color_palette: "pastel pink, soft beige",
    lighting: "soft natural light",
    texture: "smooth matte",
    character_style: "minimalist faceless",
    style_lock: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Arbitraries ────────────────────────────────────────────────────────────

const uuidArb = fc.uuid();

const brandProfileInputArb = fc.record({
  color_palette: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: null,
  }),
  lighting: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: null,
  }),
  texture: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: null,
  }),
  character_style: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
    nil: null,
  }),
  style_lock: fc.boolean(),
});

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  profileIdCounter = 0;
});

// ── Property 13: Satu Brand Profile Per User ──────────────────────────────

describe("Property 13: Satu Brand Profile Per User", () => {
  // Feature: carousa-ai, Property 13: Satu Brand Profile Per User

  it("saveBrandProfile selalu memanggil upsert (bukan insert biasa) sehingga tidak ada duplikasi", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        brandProfileInputArb,
        async (userId, profileData) => {
          vi.clearAllMocks();
          mockUpsertBrandProfile.mockResolvedValue(
            makeBrandProfile(userId, profileData),
          );

          await saveBrandProfile(userId, profileData);

          // Must call upsert exactly once — never more, never zero
          expect(mockUpsertBrandProfile).toHaveBeenCalledTimes(1);

          // The upsert must carry the correct userId
          const [, calledUserId] = mockUpsertBrandProfile.mock.calls[0] as [
            unknown,
            string,
            unknown,
          ];
          expect(calledUserId).toBe(userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("N operasi saveBrandProfile menghasilkan tepat N panggilan upsert (bukan N insert baru)", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.array(brandProfileInputArb, { minLength: 1, maxLength: 10 }),
        async (userId, profileDataList) => {
          vi.clearAllMocks();
          mockUpsertBrandProfile.mockImplementation(
            (_: unknown, uid: string, data: Partial<BrandProfile>) =>
              Promise.resolve(makeBrandProfile(uid, data)),
          );

          // Simulate N sequential saves
          for (const data of profileDataList) {
            await saveBrandProfile(userId, data);
          }

          // Each save calls upsert exactly once — total = N
          expect(mockUpsertBrandProfile).toHaveBeenCalledTimes(
            profileDataList.length,
          );

          // Every upsert call targets the same userId (no cross-user writes)
          for (const call of mockUpsertBrandProfile.mock.calls) {
            const [, calledUserId] = call as [unknown, string, unknown];
            expect(calledUserId).toBe(userId);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("saveBrandProfile mengembalikan profil dengan userId yang sama dengan input", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        brandProfileInputArb,
        async (userId, profileData) => {
          vi.clearAllMocks();
          const expectedProfile = makeBrandProfile(userId, profileData);
          mockUpsertBrandProfile.mockResolvedValue(expectedProfile);

          const result = await saveBrandProfile(userId, profileData);

          expect(result.user_id).toBe(userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("saveBrandProfile menyimpan semua atribut brand yang diberikan", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        brandProfileInputArb,
        async (userId, profileData) => {
          vi.clearAllMocks();
          mockUpsertBrandProfile.mockResolvedValue(
            makeBrandProfile(userId, profileData),
          );

          await saveBrandProfile(userId, profileData);

          // The data passed to upsert must match what was provided
          const [, , calledData] = mockUpsertBrandProfile.mock.calls[0] as [
            unknown,
            unknown,
            typeof profileData,
          ];
          expect(calledData.color_palette).toBe(profileData.color_palette);
          expect(calledData.lighting).toBe(profileData.lighting);
          expect(calledData.texture).toBe(profileData.texture);
          expect(calledData.character_style).toBe(profileData.character_style);
          expect(calledData.style_lock).toBe(profileData.style_lock);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("toggleStyleLock memanggil upsert dengan style_lock sesuai nilai yang diberikan", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, fc.boolean(), async (userId, enabled) => {
        vi.clearAllMocks();
        mockGetBrandProfile.mockResolvedValue(makeBrandProfile(userId));
        mockUpsertBrandProfile.mockResolvedValue(
          makeBrandProfile(userId, { style_lock: enabled }),
        );

        await toggleStyleLock(userId, enabled);

        expect(mockUpsertBrandProfile).toHaveBeenCalledTimes(1);
        const [, , calledData] = mockUpsertBrandProfile.mock.calls[0] as [
          unknown,
          unknown,
          { style_lock: boolean },
        ];
        expect(calledData.style_lock).toBe(enabled);
      }),
      { numRuns: 100 },
    );
  });

  it("toggleStyleLock membuat profil baru jika belum ada (tidak melempar error)", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, fc.boolean(), async (userId, enabled) => {
        vi.clearAllMocks();
        // No existing profile
        mockGetBrandProfile.mockResolvedValue(null);
        mockUpsertBrandProfile.mockResolvedValue(
          makeBrandProfile(userId, { style_lock: enabled }),
        );

        // Should not throw even when no profile exists
        await expect(toggleStyleLock(userId, enabled)).resolves.not.toThrow();

        expect(mockUpsertBrandProfile).toHaveBeenCalledTimes(1);
        const [, , calledData] = mockUpsertBrandProfile.mock.calls[0] as [
          unknown,
          unknown,
          { style_lock: boolean },
        ];
        expect(calledData.style_lock).toBe(enabled);
      }),
      { numRuns: 100 },
    );
  });

  it("getBrandProfile mengembalikan null jika profil belum ada", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        mockGetBrandProfile.mockResolvedValue(null);

        const result = await getBrandProfile(userId);

        expect(result).toBeNull();
        expect(mockGetBrandProfile).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 50 },
    );
  });

  it("getBrandProfile mengembalikan profil yang ada untuk userId yang benar", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        vi.clearAllMocks();
        const profile = makeBrandProfile(userId);
        mockGetBrandProfile.mockResolvedValue(profile);

        const result = await getBrandProfile(userId);

        expect(result).not.toBeNull();
        expect(result!.user_id).toBe(userId);
      }),
      { numRuns: 50 },
    );
  });

  it("saveBrandProfile melempar AuthorizationError jika userId kosong", async () => {
    await expect(
      saveBrandProfile("", {
        color_palette: null,
        lighting: null,
        texture: null,
        character_style: null,
        style_lock: false,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("getBrandProfile melempar AuthorizationError jika userId kosong", async () => {
    await expect(getBrandProfile("")).rejects.toThrow(AuthorizationError);
  });

  it("toggleStyleLock melempar AuthorizationError jika userId kosong", async () => {
    await expect(toggleStyleLock("", true)).rejects.toThrow(AuthorizationError);
  });
});
