// ============================================================
// Carousa-AI — Unit / Property-Based Tests: Validation Utils
// ============================================================
// Feature: carousa-ai, Property 4: Validasi Nama Project Kosong
// Feature: carousa-ai, Property 6: Validasi Rentang Jumlah Slide

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateProjectName,
  validateSlideCount,
} from "@/lib/utils/validation";

// ── Property 4: Validasi Nama Project Kosong ──────────────────────────────

describe("Property 4: Validasi Nama Project Kosong", () => {
  // Feature: carousa-ai, Property 4: Validasi Nama Project Kosong

  it("string yang hanya terdiri dari whitespace harus ditolak", () => {
    // Arbitrary: strings made exclusively of whitespace characters
    const whitespaceOnlyArb = fc
      .array(fc.constantFrom(" ", "\t", "\n", "\r", "\u00a0"), {
        minLength: 1,
        maxLength: 50,
      })
      .map((chars) => chars.join(""));

    fc.assert(
      fc.property(whitespaceOnlyArb, (name) => {
        const result = validateProjectName(name);
        expect(result.valid, `"${name}" harus ditolak`).toBe(false);
        expect(result.error, "harus ada pesan error").toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it("string kosong harus ditolak", () => {
    const result = validateProjectName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("string yang mengandung setidaknya satu karakter non-whitespace harus diterima", () => {
    // Arbitrary: strings that have at least one non-whitespace character
    const validNameArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validNameArb, (name) => {
        const result = validateProjectName(name);
        expect(result.valid, `"${name}" harus diterima`).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("nama dengan whitespace di awal/akhir tetap diterima jika ada konten", () => {
    // Leading/trailing whitespace is fine — only all-whitespace is rejected
    const paddedNameArb = fc
      .tuple(
        fc
          .string({ minLength: 0, maxLength: 10 })
          .map((s) => s.replace(/\S/g, " ")),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc
          .string({ minLength: 0, maxLength: 10 })
          .map((s) => s.replace(/\S/g, " ")),
      )
      .map(([pre, core, post]) => pre + core + post);

    fc.assert(
      fc.property(paddedNameArb, (name) => {
        const result = validateProjectName(name);
        expect(result.valid, `"${name}" harus diterima`).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: Validasi Rentang Jumlah Slide ─────────────────────────────

describe("Property 6: Validasi Rentang Jumlah Slide", () => {
  // Feature: carousa-ai, Property 6: Validasi Rentang Jumlah Slide

  it("nilai dalam rentang [3, 20] harus diterima", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), (count) => {
        const result = validateSlideCount(count);
        expect(result.valid, `${count} harus diterima`).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("nilai di bawah 3 harus ditolak", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000, max: 2 }), (count) => {
        const result = validateSlideCount(count);
        expect(result.valid, `${count} harus ditolak`).toBe(false);
        expect(result.error).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it("nilai di atas 20 harus ditolak", () => {
    fc.assert(
      fc.property(fc.integer({ min: 21, max: 10_000 }), (count) => {
        const result = validateSlideCount(count);
        expect(result.valid, `${count} harus ditolak`).toBe(false);
        expect(result.error).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it("nilai non-integer harus ditolak", () => {
    // Float values outside integer range
    const floatArb = fc
      .float({ min: -1000, max: 1000 })
      .filter((n) => !Number.isInteger(n));

    fc.assert(
      fc.property(floatArb, (count) => {
        const result = validateSlideCount(count);
        expect(result.valid, `${count} (float) harus ditolak`).toBe(false);
        expect(result.error).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it("batas bawah (3) dan batas atas (20) harus diterima", () => {
    expect(validateSlideCount(3).valid).toBe(true);
    expect(validateSlideCount(20).valid).toBe(true);
  });

  it("tepat di luar batas (2 dan 21) harus ditolak", () => {
    expect(validateSlideCount(2).valid).toBe(false);
    expect(validateSlideCount(21).valid).toBe(false);
  });
});
