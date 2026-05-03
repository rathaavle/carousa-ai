// ============================================================
// Carousa-AI — Unit / Property-Based Tests: Cascade Delete
// ============================================================
// Feature: carousa-ai, Property 5: Cascade Delete Project
//
// Strategy: mock the db query helpers so we can verify that
// deleteProject always calls the underlying delete helper with
// the correct project id and user id, and that ownership is
// checked before deletion. The actual CASCADE behaviour is
// enforced by the database schema; here we verify the module
// contract (ownership check + delete call).

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { Project } from "@/lib/db/types";
import { AuthorizationError } from "@/lib/utils/errors";

// ── Mock db/server (createClient) ────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/db/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// ── Mock db/queries ───────────────────────────────────────────────────────

const mockGetProjectById = vi.fn();
const mockDeleteProject = vi.fn();

vi.mock("@/lib/db/queries", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
  // Other query helpers used by the module (not needed here)
  getProjects: vi.fn(),
  createProject: vi.fn(),
}));

// Import AFTER mocks are registered
import { deleteProject } from "@/modules/project";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProject(id: string, userId: string): Project {
  return {
    id,
    user_id: userId,
    name: "Test Project",
    theme_id: null,
    total_slides: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteProject.mockResolvedValue(undefined);
});

// ── Property 5: Cascade Delete Project ───────────────────────────────────

describe("Property 5: Cascade Delete Project", () => {
  // Feature: carousa-ai, Property 5: Cascade Delete Project

  it("deleteProject memanggil db delete dengan id dan userId yang benar ketika user adalah pemilik", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (projectId, userId) => {
        vi.clearAllMocks();
        // Simulate: project exists and belongs to userId
        mockGetProjectById.mockResolvedValue(makeProject(projectId, userId));
        mockDeleteProject.mockResolvedValue(undefined);

        await deleteProject(projectId, userId);

        // Ownership check must have been called
        expect(mockGetProjectById).toHaveBeenCalledTimes(1);
        const [, calledId, calledUserId] = mockGetProjectById.mock.calls[0] as [
          unknown,
          string,
          string,
        ];
        expect(calledId).toBe(projectId);
        expect(calledUserId).toBe(userId);

        // Delete must have been called exactly once with correct args
        expect(mockDeleteProject).toHaveBeenCalledTimes(1);
        const [, deletedId, deletedUserId] = mockDeleteProject.mock
          .calls[0] as [unknown, string, string];
        expect(deletedId).toBe(projectId);
        expect(deletedUserId).toBe(userId);
      }),
      { numRuns: 100 },
    );
  });

  it("deleteProject melempar AuthorizationError dan TIDAK memanggil delete ketika project tidak ditemukan", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (projectId, userId) => {
        vi.clearAllMocks();
        // Simulate: project not found (different owner or doesn't exist)
        mockGetProjectById.mockResolvedValue(null);

        await expect(deleteProject(projectId, userId)).rejects.toThrow(
          AuthorizationError,
        );

        // Delete must NOT have been called
        expect(mockDeleteProject).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("deleteProject melempar AuthorizationError ketika project dimiliki user lain", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (projectId, ownerId, requesterId) => {
          // Skip when requester happens to be the owner (same UUID)
          fc.pre(ownerId !== requesterId);

          vi.clearAllMocks();
          // Project exists but belongs to ownerId, not requesterId
          mockGetProjectById.mockResolvedValue(null); // RLS returns null for wrong user

          await expect(deleteProject(projectId, requesterId)).rejects.toThrow(
            AuthorizationError,
          );

          expect(mockDeleteProject).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deleteProject tidak memanggil delete lebih dari sekali per operasi", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (projectId, userId) => {
        vi.clearAllMocks();
        mockGetProjectById.mockResolvedValue(makeProject(projectId, userId));
        mockDeleteProject.mockResolvedValue(undefined);

        await deleteProject(projectId, userId);

        expect(mockDeleteProject).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });

  it("ownership check selalu dilakukan sebelum delete (getProjectById dipanggil sebelum deleteProject)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (projectId, userId) => {
        vi.clearAllMocks();
        const callOrder: string[] = [];

        mockGetProjectById.mockImplementation(() => {
          callOrder.push("getProjectById");
          return Promise.resolve(makeProject(projectId, userId));
        });
        mockDeleteProject.mockImplementation(() => {
          callOrder.push("deleteProject");
          return Promise.resolve(undefined);
        });

        await deleteProject(projectId, userId);

        expect(callOrder[0]).toBe("getProjectById");
        expect(callOrder[1]).toBe("deleteProject");
      }),
      { numRuns: 100 },
    );
  });
});
