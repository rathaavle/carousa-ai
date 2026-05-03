// ============================================================
// Carousa-AI — Unit / Property-Based Tests: Project Sort Order
// ============================================================
// Feature: carousa-ai, Property 3: Urutan Project di Dashboard

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { sortProjectsByUpdatedAt } from "@/modules/project";
import type { Project } from "@/lib/db/types";

// ── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a random ISO timestamp between 2020-01-01 and 2030-01-01. */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .integer({ min: 1577836800000, max: 1893456000000 }) // 2020–2030 in ms
  .map((ms) => new Date(ms).toISOString());

const projectArb: fc.Arbitrary<Project> = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  name: fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0),
  theme_id: fc.option(fc.uuid(), { nil: null }),
  total_slides: fc.integer({ min: 3, max: 20 }),
  created_at: isoTimestampArb,
  updated_at: isoTimestampArb,
});

// ── Property 3: Urutan Project di Dashboard ───────────────────────────────

describe("Property 3: Urutan Project di Dashboard", () => {
  // Feature: carousa-ai, Property 3: Urutan Project di Dashboard

  it("hasil sort selalu terurut descending berdasarkan updated_at", () => {
    fc.assert(
      fc.property(
        fc.array(projectArb, { minLength: 0, maxLength: 20 }),
        (projects) => {
          const sorted = sortProjectsByUpdatedAt(projects);

          // Verify descending order: each element's updated_at >= next element's
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = new Date(sorted[i].updated_at).getTime();
            const next = new Date(sorted[i + 1].updated_at).getTime();
            expect(
              current,
              `sorted[${i}].updated_at harus >= sorted[${i + 1}].updated_at`,
            ).toBeGreaterThanOrEqual(next);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sort tidak mengubah jumlah elemen", () => {
    fc.assert(
      fc.property(
        fc.array(projectArb, { minLength: 0, maxLength: 20 }),
        (projects) => {
          const sorted = sortProjectsByUpdatedAt(projects);
          expect(sorted.length).toBe(projects.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sort tidak memutasi array asli", () => {
    fc.assert(
      fc.property(
        fc.array(projectArb, { minLength: 1, maxLength: 10 }),
        (projects) => {
          const originalIds = projects.map((p) => p.id);
          sortProjectsByUpdatedAt(projects);
          // Original array order must be unchanged
          expect(projects.map((p) => p.id)).toEqual(originalIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sort mengandung elemen yang sama persis dengan input (tidak ada yang hilang atau ditambah)", () => {
    fc.assert(
      fc.property(
        fc.array(projectArb, { minLength: 0, maxLength: 20 }),
        (projects) => {
          const sorted = sortProjectsByUpdatedAt(projects);
          const inputIds = new Set(projects.map((p) => p.id));
          const sortedIds = new Set(sorted.map((p) => p.id));

          // Same set of IDs
          expect(sortedIds.size).toBe(inputIds.size);
          for (const id of inputIds) {
            expect(sortedIds.has(id), `ID ${id} harus ada di hasil sort`).toBe(
              true,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("project terbaru selalu muncul pertama", () => {
    fc.assert(
      fc.property(
        fc.array(projectArb, { minLength: 2, maxLength: 20 }),
        (projects) => {
          const sorted = sortProjectsByUpdatedAt(projects);
          const maxUpdatedAt = Math.max(
            ...projects.map((p) => new Date(p.updated_at).getTime()),
          );
          const firstUpdatedAt = new Date(sorted[0].updated_at).getTime();
          expect(firstUpdatedAt).toBe(maxUpdatedAt);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("array kosong menghasilkan array kosong", () => {
    expect(sortProjectsByUpdatedAt([])).toEqual([]);
  });

  it("array satu elemen menghasilkan array yang sama", () => {
    fc.assert(
      fc.property(projectArb, (project) => {
        const sorted = sortProjectsByUpdatedAt([project]);
        expect(sorted).toHaveLength(1);
        expect(sorted[0].id).toBe(project.id);
      }),
      { numRuns: 50 },
    );
  });
});
