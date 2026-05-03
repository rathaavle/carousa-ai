// ============================================================
// Carousa-AI — Unit / Property-Based Tests: PromptBuilder
// ============================================================
// Feature: carousa-ai, Property 11: Kelengkapan Struktur Prompt
// Feature: carousa-ai, Property 12: Kondisionalitas Style Lock pada Prompt

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { PromptBuilder } from "@/lib/prompt/builder";
import type { Theme, Slide, BrandProfile } from "@/lib/db/types";

// ── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a non-empty, non-whitespace-only string. */
const nonEmptyString = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

/** Generate a nullable non-empty string (simulates optional DB fields). */
const nullableString = fc.option(nonEmptyString, { nil: null });

const themeArb: fc.Arbitrary<Theme> = fc.record({
  id: fc.uuid(),
  name: nonEmptyString,
  mood: nonEmptyString,
  color_base: nonEmptyString,
  lighting: nonEmptyString,
});

const slideArb: fc.Arbitrary<Slide> = fc.record({
  id: fc.uuid(),
  project_id: fc.uuid(),
  index: fc.integer({ min: 0, max: 19 }),
  text: nullableString,
  emotion: nullableString,
  scene: nullableString,
  prompt: nullableString,
  image_url: nullableString,
  created_at: fc.constant(new Date().toISOString()),
  updated_at: fc.constant(new Date().toISOString()),
});

const brandProfileArb: fc.Arbitrary<BrandProfile> = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  color_palette: nullableString,
  lighting: nullableString,
  texture: nullableString,
  character_style: nullableString,
  style_lock: fc.boolean(),
});

// ── Helpers ────────────────────────────────────────────────────────────────

const REQUIRED_COMPONENTS = [
  "[GLOBAL STYLE]",
  "[BRAND STYLE]",
  "[CHARACTER]",
  "[SCENE]",
  "[EMOTION]",
  "[COMPOSITION]",
  "[TYPOGRAPHY]",
] as const;

const builder = new PromptBuilder();

// ── Property 11: Kelengkapan Struktur Prompt ───────────────────────────────

describe("Property 11: Kelengkapan Struktur Prompt", () => {
  // Feature: carousa-ai, Property 11: Kelengkapan Struktur Prompt
  it("prompt selalu mengandung semua 7 komponen struktur — style lock aktif", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        brandProfileArb,
        (theme, slide, brandProfile) => {
          const prompt = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled: true,
          });

          for (const component of REQUIRED_COMPONENTS) {
            expect(
              prompt,
              `Komponen "${component}" tidak ditemukan dalam prompt`,
            ).toContain(component);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: carousa-ai, Property 11: Kelengkapan Struktur Prompt
  it("prompt selalu mengandung semua 7 komponen struktur — style lock tidak aktif", () => {
    fc.assert(
      fc.property(themeArb, slideArb, (theme, slide) => {
        const prompt = builder.build({
          theme,
          slide,
          brandProfile: null,
          styleLockEnabled: false,
        });

        for (const component of REQUIRED_COMPONENTS) {
          expect(
            prompt,
            `Komponen "${component}" tidak ditemukan dalam prompt`,
          ).toContain(component);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: carousa-ai, Property 11: Kelengkapan Struktur Prompt
  it("prompt selalu mengandung semua 7 komponen struktur — brand profile null, style lock aktif", () => {
    fc.assert(
      fc.property(themeArb, slideArb, (theme, slide) => {
        const prompt = builder.build({
          theme,
          slide,
          brandProfile: null,
          styleLockEnabled: true,
        });

        for (const component of REQUIRED_COMPONENTS) {
          expect(prompt).toContain(component);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("setiap komponen memiliki konten non-kosong setelah label", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        brandProfileArb,
        fc.boolean(),
        (theme, slide, brandProfile, styleLockEnabled) => {
          const prompt = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled,
          });

          // Each component label must be followed by non-whitespace content
          // before the next label or end of string.
          for (const component of REQUIRED_COMPONENTS) {
            const idx = prompt.indexOf(component);
            expect(
              idx,
              `Label "${component}" tidak ditemukan`,
            ).toBeGreaterThanOrEqual(0);

            // Content starts right after the label
            const afterLabel = prompt.slice(idx + component.length).trim();
            expect(
              afterLabel.length,
              `Konten setelah "${component}" kosong`,
            ).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 12: Kondisionalitas Style Lock pada Prompt ───────────────────

describe("Property 12: Kondisionalitas Style Lock pada Prompt", () => {
  /**
   * Build a brand profile with all fields populated so we can reliably
   * check whether they appear in the prompt or not.
   */
  const fullBrandProfileArb: fc.Arbitrary<BrandProfile> = fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    // Use printable ASCII to avoid regex/contains edge cases
    color_palette: fc
      .string({ minLength: 3, maxLength: 40 })
      .filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s) && s.trim().length > 0),
    lighting: fc
      .string({ minLength: 3, maxLength: 40 })
      .filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s) && s.trim().length > 0),
    texture: fc
      .string({ minLength: 3, maxLength: 40 })
      .filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s) && s.trim().length > 0),
    character_style: fc
      .string({ minLength: 3, maxLength: 40 })
      .filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s) && s.trim().length > 0),
    style_lock: fc.constant(true), // always true so fields are non-null
  });

  // Feature: carousa-ai, Property 12: Kondisionalitas Style Lock pada Prompt
  it("jika style_lock = true, atribut brand muncul di dalam prompt", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        fullBrandProfileArb,
        (theme, slide, brandProfile) => {
          const prompt = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled: true,
          });

          // At least one brand attribute must appear in the [BRAND STYLE] section
          const brandStyleSection = extractSection(prompt, "[BRAND STYLE]");

          const hasBrandContent =
            brandStyleSection !== "no specific brand style" &&
            brandStyleSection.trim().length > 0;

          expect(
            hasBrandContent,
            `[BRAND STYLE] harus mengandung atribut brand ketika style_lock = true. ` +
              `Nilai: "${brandStyleSection}"`,
          ).toBe(true);

          // Verify specific brand values appear somewhere in the prompt
          const brandValues = [
            brandProfile.color_palette,
            brandProfile.lighting,
            brandProfile.texture,
          ].filter((v): v is string => v !== null && v.trim().length > 0);

          for (const value of brandValues) {
            expect(
              prompt,
              `Nilai brand "${value}" harus muncul di prompt ketika style_lock = true`,
            ).toContain(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: carousa-ai, Property 12: Kondisionalitas Style Lock pada Prompt
  it("jika style_lock = false, atribut brand tidak muncul di dalam prompt", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        fullBrandProfileArb,
        (theme, slide, brandProfile) => {
          const prompt = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled: false,
          });

          const brandStyleSection = extractSection(prompt, "[BRAND STYLE]");

          // When style lock is off, the brand style section must be the fallback
          expect(
            brandStyleSection,
            `[BRAND STYLE] harus berisi fallback ketika style_lock = false`,
          ).toBe("no specific brand style");

          // Brand-specific values must NOT appear in the prompt
          const brandValues = [
            brandProfile.color_palette,
            brandProfile.lighting,
            brandProfile.texture,
          ].filter((v): v is string => v !== null && v.trim().length > 0);

          for (const value of brandValues) {
            // The value should not appear in the brand style section
            expect(
              brandStyleSection,
              `Nilai brand "${value}" tidak boleh muncul di [BRAND STYLE] ketika style_lock = false`,
            ).not.toContain(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: carousa-ai, Property 12: Kondisionalitas Style Lock pada Prompt
  it("jika brand profile null, atribut brand tidak muncul terlepas dari style_lock", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        fc.boolean(),
        (theme, slide, styleLockEnabled) => {
          const prompt = builder.build({
            theme,
            slide,
            brandProfile: null,
            styleLockEnabled,
          });

          const brandStyleSection = extractSection(prompt, "[BRAND STYLE]");

          expect(
            brandStyleSection,
            `[BRAND STYLE] harus berisi fallback ketika brand profile null`,
          ).toBe("no specific brand style");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("mengaktifkan dan menonaktifkan style_lock menghasilkan prompt yang berbeda (brand profile lengkap)", () => {
    fc.assert(
      fc.property(
        themeArb,
        slideArb,
        fullBrandProfileArb,
        (theme, slide, brandProfile) => {
          const withLock = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled: true,
          });

          const withoutLock = builder.build({
            theme,
            slide,
            brandProfile,
            styleLockEnabled: false,
          });

          // The two prompts must differ because brand attributes are included/excluded
          expect(withLock).not.toEqual(withoutLock);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the content of a named section from the assembled prompt.
 *
 * The prompt format is:
 *   "[LABEL1] content1, [LABEL2] content2, ..."
 *
 * Returns the trimmed content between `label` and the next `[` or end of string.
 */
function extractSection(prompt: string, label: string): string {
  const start = prompt.indexOf(label);
  if (start === -1) return "";

  const afterLabel = prompt.slice(start + label.length);
  // Content ends at the next component label or end of string
  const nextLabel = afterLabel.indexOf("[");
  const raw = nextLabel === -1 ? afterLabel : afterLabel.slice(0, nextLabel);

  // Strip leading ", " separator and trailing ", " separator
  return raw
    .replace(/^,?\s*/, "")
    .replace(/,\s*$/, "")
    .trim();
}
