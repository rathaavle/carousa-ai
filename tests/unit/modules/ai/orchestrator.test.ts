// ============================================================
// Carousa-AI — Unit / Property-Based Tests: AI_Orchestrator
// ============================================================
// Feature: carousa-ai, Property 8: Pencatatan Generation Record
//
// Strategy: mock the db query helpers (createGenerationRecord /
// updateGenerationRecord) and the AI providers directly so the
// tests run without network access and focus purely on the
// record-keeping contract.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { Generation, Theme } from "@/lib/db/types";

// ── Mock db query helpers ─────────────────────────────────────────────────
// We mock the module that the orchestrator imports, so every call to
// createGenerationRecord / updateGenerationRecord is intercepted.

const mockCreateGenerationRecord = vi.fn();
const mockUpdateGenerationRecord = vi.fn();

vi.mock("@/lib/db/queries", () => ({
  createGenerationRecord: (...args: unknown[]) =>
    mockCreateGenerationRecord(...args),
  updateGenerationRecord: (...args: unknown[]) =>
    mockUpdateGenerationRecord(...args),
}));

// ── Mock AI providers ─────────────────────────────────────────────────────

const mockGeminiGenerateText = vi.fn();
const mockStabilityGenerateImage = vi.fn();

vi.mock("@/lib/ai/gemini-provider", () => ({
  GeminiProvider: vi.fn().mockImplementation(() => ({
    generateText: (...args: unknown[]) => mockGeminiGenerateText(...args),
    generateImage: (...args: unknown[]) => mockStabilityGenerateImage(...args),
  })),
}));

// Import AFTER mocks are registered
import { AI_Orchestrator } from "@/modules/ai/orchestrator";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Minimal Supabase client stub — the orchestrator only uses it to pass
 *  to createGenerationRecord / updateGenerationRecord, which are mocked. */
const stubSupabase = {} as Parameters<
  typeof AI_Orchestrator.prototype.constructor
>[0];

let idCounter = 0;

function makeGenRecord(overrides: Partial<Generation> = {}): Generation {
  return {
    id: `gen-${++idCounter}`,
    project_id: "proj-1",
    slide_id: null,
    type: "story",
    provider: "gemini",
    status: "processing",
    error_msg: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Arbitraries ────────────────────────────────────────────────────────────

const uuidArb = fc.uuid();

const themeArb: fc.Arbitrary<Theme> = fc.record({
  id: uuidArb,
  name: fc.constant("Test Theme"),
  mood: fc.constant("aesthetic"),
  color_base: fc.constant("pastel tones"),
  lighting: fc.constant("soft natural light"),
});

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;

  mockGeminiGenerateText.mockResolvedValue({
    content: "mock story text",
    tokensUsed: 42,
  });
  mockStabilityGenerateImage.mockResolvedValue({
    imageBuffer: Buffer.from("fake-image"),
    mimeType: "image/png",
  });

  // Default: db helpers succeed and return a synthetic record
  mockCreateGenerationRecord.mockImplementation(
    (_supabase: unknown, record: Partial<Generation>) =>
      Promise.resolve(makeGenRecord(record)),
  );
  mockUpdateGenerationRecord.mockResolvedValue(undefined);
});

// ── Property 8: Pencatatan Generation Record ───────────────────────────────

describe("Property 8: Pencatatan Generation Record", () => {
  // Feature: carousa-ai, Property 8: Pencatatan Generation Record

  // ── generateStory — success ──────────────────────────────────────────────

  it("generateStory berhasil: membuat record 'processing' lalu update ke 'success'", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        themeArb,
        fc.integer({ min: 3, max: 20 }),
        async (projectId, theme, slideCount) => {
          vi.clearAllMocks();
          mockCreateGenerationRecord.mockResolvedValue(
            makeGenRecord({
              project_id: projectId,
              type: "story",
              provider: "gemini",
            }),
          );
          mockUpdateGenerationRecord.mockResolvedValue(undefined);
          mockGeminiGenerateText.mockResolvedValue({
            content: "story",
            tokensUsed: 10,
          });

          const orchestrator = new AI_Orchestrator(stubSupabase);
          await orchestrator.generateStory({ projectId, theme, slideCount });

          // Exactly one insert, exactly one update
          expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);
          expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);

          // Insert carries all required attributes
          const [, insertArg] = mockCreateGenerationRecord.mock.calls[0] as [
            unknown,
            Partial<Generation>,
          ];
          expect(insertArg.project_id).toBe(projectId);
          expect(insertArg.type).toBe("story");
          expect(insertArg.provider).toBe("gemini");
          expect(insertArg.status).toBe("processing");

          // Update sets status to success
          const [, , updateArg] = mockUpdateGenerationRecord.mock.calls[0] as [
            unknown,
            unknown,
            Partial<Generation>,
          ];
          expect(updateArg.status).toBe("success");
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── generateStory — failure ──────────────────────────────────────────────

  it("generateStory gagal: membuat record 'processing' lalu update ke 'failed' dengan error_msg", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        themeArb,
        fc.integer({ min: 3, max: 20 }),
        async (projectId, theme, slideCount) => {
          vi.clearAllMocks();
          mockCreateGenerationRecord.mockResolvedValue(
            makeGenRecord({
              project_id: projectId,
              type: "story",
              provider: "gemini",
            }),
          );
          mockUpdateGenerationRecord.mockResolvedValue(undefined);
          mockGeminiGenerateText.mockRejectedValue(
            new Error("API quota exceeded"),
          );

          const orchestrator = new AI_Orchestrator(stubSupabase);
          await expect(
            orchestrator.generateStory({ projectId, theme, slideCount }),
          ).rejects.toThrow();

          expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);
          expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);

          const [, insertArg] = mockCreateGenerationRecord.mock.calls[0] as [
            unknown,
            Partial<Generation>,
          ];
          expect(insertArg.status).toBe("processing");

          const [, , updateArg] = mockUpdateGenerationRecord.mock.calls[0] as [
            unknown,
            unknown,
            Partial<Generation>,
          ];
          expect(updateArg.status).toBe("failed");
          expect(typeof updateArg.error_msg).toBe("string");
          expect(updateArg.error_msg!.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── generateImage — success ──────────────────────────────────────────────

  it("generateImage berhasil: record type='image', provider='gemini', update ke 'success'", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, uuidArb, async (projectId, slideId) => {
        vi.clearAllMocks();
        mockCreateGenerationRecord.mockResolvedValue(
          makeGenRecord({
            project_id: projectId,
            type: "image",
            provider: "gemini",
          }),
        );
        mockUpdateGenerationRecord.mockResolvedValue(undefined);
        mockStabilityGenerateImage.mockResolvedValue({
          imageBuffer: Buffer.from("img"),
          mimeType: "image/png",
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        await orchestrator.generateImage(
          "a beautiful sunset",
          projectId,
          slideId,
        );

        expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);
        expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);

        const [, insertArg] = mockCreateGenerationRecord.mock.calls[0] as [
          unknown,
          Partial<Generation>,
        ];
        expect(insertArg.project_id).toBe(projectId);
        expect(insertArg.type).toBe("image");
        expect(insertArg.provider).toBe("gemini");
        expect(insertArg.status).toBe("processing");

        const [, , updateArg] = mockUpdateGenerationRecord.mock.calls[0] as [
          unknown,
          unknown,
          Partial<Generation>,
        ];
        expect(updateArg.status).toBe("success");
      }),
      { numRuns: 100 },
    );
  });

  // ── generateImage — failure ──────────────────────────────────────────────

  it("generateImage gagal: update ke 'failed' dengan error_msg dari provider", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (projectId) => {
        vi.clearAllMocks();
        mockCreateGenerationRecord.mockResolvedValue(
          makeGenRecord({
            project_id: projectId,
            type: "image",
            provider: "gemini",
          }),
        );
        mockUpdateGenerationRecord.mockResolvedValue(undefined);
        mockStabilityGenerateImage.mockRejectedValue(
          new Error("Gemini image API rate limit"),
        );

        const orchestrator = new AI_Orchestrator(stubSupabase);
        await expect(
          orchestrator.generateImage("test prompt", projectId),
        ).rejects.toThrow();

        expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);
        const [, , updateArg] = mockUpdateGenerationRecord.mock.calls[0] as [
          unknown,
          unknown,
          Partial<Generation>,
        ];
        expect(updateArg.status).toBe("failed");
        expect(updateArg.error_msg).toContain("Gemini image API rate limit");
      }),
      { numRuns: 100 },
    );
  });

  // ── generateCaption — success ────────────────────────────────────────────

  it("generateCaption berhasil: record type='caption', provider='gemini', update ke 'success'", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (projectId, slideTexts) => {
          vi.clearAllMocks();
          mockCreateGenerationRecord.mockResolvedValue(
            makeGenRecord({
              project_id: projectId,
              type: "caption",
              provider: "gemini",
            }),
          );
          mockUpdateGenerationRecord.mockResolvedValue(undefined);
          mockGeminiGenerateText.mockResolvedValue({
            content: "caption text",
            tokensUsed: 20,
          });

          const orchestrator = new AI_Orchestrator(stubSupabase);
          await orchestrator.generateCaption(projectId, slideTexts);

          expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);
          expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);

          const [, insertArg] = mockCreateGenerationRecord.mock.calls[0] as [
            unknown,
            Partial<Generation>,
          ];
          expect(insertArg.project_id).toBe(projectId);
          expect(insertArg.type).toBe("caption");
          expect(insertArg.provider).toBe("gemini");
          expect(insertArg.status).toBe("processing");

          const [, , updateArg] = mockUpdateGenerationRecord.mock.calls[0] as [
            unknown,
            unknown,
            Partial<Generation>,
          ];
          expect(updateArg.status).toBe("success");
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Atribut wajib — semua operasi ────────────────────────────────────────

  it("setiap insert record selalu memiliki semua atribut wajib: project_id, type, provider, status='processing'", async () => {
    // Feature: carousa-ai, Property 8: Pencatatan Generation Record
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        themeArb,
        fc.integer({ min: 0, max: 2 }),
        async (projectId, theme, opIndex) => {
          vi.clearAllMocks();
          mockCreateGenerationRecord.mockImplementation(
            (_: unknown, record: Partial<Generation>) =>
              Promise.resolve(makeGenRecord(record)),
          );
          mockUpdateGenerationRecord.mockResolvedValue(undefined);
          mockGeminiGenerateText.mockResolvedValue({
            content: "text",
            tokensUsed: 5,
          });
          mockStabilityGenerateImage.mockResolvedValue({
            imageBuffer: Buffer.from("img"),
            mimeType: "image/png",
          });

          const orchestrator = new AI_Orchestrator(stubSupabase);

          const operations = [
            () =>
              orchestrator.generateStory({ projectId, theme, slideCount: 5 }),
            () => orchestrator.generateImage("prompt", projectId),
            () => orchestrator.generateCaption(projectId, ["slide 1"]),
          ];

          try {
            await operations[opIndex]();
          } catch {
            // Failures are acceptable; we still verify the record was created
          }

          expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);

          const [, insertArg] = mockCreateGenerationRecord.mock.calls[0] as [
            unknown,
            Partial<Generation>,
          ];
          expect(insertArg.project_id, "project_id wajib ada").toBe(projectId);
          expect(insertArg.type, "type wajib ada").toBeTruthy();
          expect(insertArg.provider, "provider wajib ada").toBeTruthy();
          expect(insertArg.status, "status awal harus 'processing'").toBe(
            "processing",
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("setiap operasi AI menghasilkan tepat satu insert dan satu update record", async () => {
    // Feature: carousa-ai, Property 8: Pencatatan Generation Record
    await fc.assert(
      fc.asyncProperty(uuidArb, themeArb, async (projectId, theme) => {
        vi.clearAllMocks();
        mockCreateGenerationRecord.mockImplementation(
          (_: unknown, record: Partial<Generation>) =>
            Promise.resolve(makeGenRecord(record)),
        );
        mockUpdateGenerationRecord.mockResolvedValue(undefined);
        mockGeminiGenerateText.mockResolvedValue({
          content: "story",
          tokensUsed: 10,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        await orchestrator.generateStory({ projectId, theme, slideCount: 5 });

        expect(mockCreateGenerationRecord).toHaveBeenCalledTimes(1);
        expect(mockUpdateGenerationRecord).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });
});
