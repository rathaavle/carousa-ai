// ============================================================
// Carousa-AI — Unit / Property-Based Tests: Storyline Parser
// ============================================================
// Feature: carousa-ai, Property 7: Konsistensi Parsing Storyline
//
// Strategy: mock GeminiProvider so generateSlides() runs without
// network access. We control the AI response to test that the
// parsing + normalisation logic always produces exactly N segments
// with the required attributes (text, emotion, scene).

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ── Mock AI providers ─────────────────────────────────────────────────────
// Must be declared before importing the module under test.

const mockGeminiGenerateText = vi.fn();

vi.mock("@/lib/ai/gemini-provider", () => ({
  GeminiProvider: vi.fn().mockImplementation(() => ({
    generateText: (...args: unknown[]) => mockGeminiGenerateText(...args),
    generateImage: vi.fn().mockResolvedValue({
      imageBuffer: Buffer.from("img"),
      mimeType: "image/png",
    }),
  })),
}));

// Mock db helpers — generateSlides() does not use them, but the
// orchestrator constructor wires them up so we mock to avoid errors.
vi.mock("@/lib/db/queries", () => ({
  createGenerationRecord: vi.fn(),
  updateGenerationRecord: vi.fn(),
}));

// Import AFTER mocks are registered
import { AI_Orchestrator } from "@/modules/ai/orchestrator";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Minimal Supabase stub — generateSlides() does not touch the DB. */
const stubSupabase = {} as Parameters<
  typeof AI_Orchestrator.prototype.constructor
>[0];

/**
 * Build a valid JSON response string that Gemini would return for
 * `slideCount` slides.
 */
function buildJsonResponse(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, i) => ({
    text: `Slide ${i + 1} text content`,
    emotion: "hopeful",
    scene: "sunset over mountains",
  }));
  return JSON.stringify(slides);
}

/**
 * Build a plain-text story string long enough to be split evenly.
 * Uses `slideCount * 3` sentences so splitStoryEvenly() has enough
 * material to fill every slot.
 */
function buildStoryText(slideCount: number): string {
  return Array.from(
    { length: slideCount * 3 },
    (_, i) => `This is sentence number ${i + 1} of the story.`,
  ).join(" ");
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Property 7: Konsistensi Parsing Storyline ──────────────────────────────

describe("Property 7: Konsistensi Parsing Storyline", () => {
  // Feature: carousa-ai, Property 7: Konsistensi Parsing Storyline

  // ── Validates: Requirements 4.2 ───────────────────────────────────────────

  it("should always produce exactly N segments for any N in [3, 20] — Gemini returns valid JSON", async () => {
    // **Validates: Requirements 4.2**
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Gemini returns a well-formed JSON array with exactly slideCount items
        mockGeminiGenerateText.mockResolvedValue({
          content: buildJsonResponse(slideCount),
          tokensUsed: 50,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        // Must return exactly N segments
        expect(segments).toHaveLength(slideCount);
      }),
      { numRuns: 100 },
    );
  });

  it("should always produce exactly N segments for any N in [3, 20] — Gemini returns fewer items than requested", async () => {
    // **Validates: Requirements 4.2**
    // Tests the padding / normalisation path: Gemini returns fewer segments
    // than requested; normalizeSlideCount() must pad to exactly N.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Gemini returns only 1 segment regardless of slideCount
        mockGeminiGenerateText.mockResolvedValue({
          content: JSON.stringify([
            { text: "Only one slide", emotion: "calm", scene: "empty room" },
          ]),
          tokensUsed: 10,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        expect(segments).toHaveLength(slideCount);
      }),
      { numRuns: 100 },
    );
  });

  it("should always produce exactly N segments for any N in [3, 20] — Gemini returns more items than requested", async () => {
    // **Validates: Requirements 4.2**
    // Tests the truncation path: Gemini returns more segments than requested;
    // normalizeSlideCount() must truncate to exactly N.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Gemini returns 20 segments regardless of slideCount
        mockGeminiGenerateText.mockResolvedValue({
          content: buildJsonResponse(20),
          tokensUsed: 100,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        expect(segments).toHaveLength(slideCount);
      }),
      { numRuns: 100 },
    );
  });

  it("should always produce exactly N segments for any N in [3, 20] — Gemini fails (fallback path)", async () => {
    // **Validates: Requirements 4.2**
    // Tests the fallback path: when Gemini throws, splitStoryEvenly() is used
    // and normalizeSlideCount() still guarantees exactly N segments.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Gemini throws — triggers the catch block in generateSlides()
        mockGeminiGenerateText.mockRejectedValue(
          new Error("Gemini API unavailable"),
        );

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        expect(segments).toHaveLength(slideCount);
      }),
      { numRuns: 100 },
    );
  });

  it("should always produce exactly N segments for any N in [3, 20] — Gemini returns invalid JSON (fallback path)", async () => {
    // **Validates: Requirements 4.2**
    // Tests the JSON-parse-failure fallback: when Gemini returns non-JSON,
    // parseSlideJson() throws and splitStoryEvenly() is used instead.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Gemini returns plain text instead of JSON
        mockGeminiGenerateText.mockResolvedValue({
          content: "This is not valid JSON at all.",
          tokensUsed: 5,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        expect(segments).toHaveLength(slideCount);
      }),
      { numRuns: 100 },
    );
  });

  // ── Attribute completeness ─────────────────────────────────────────────

  it("every segment must have non-empty text, emotion, and scene attributes", async () => {
    // **Validates: Requirements 4.2, 4.3**
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        mockGeminiGenerateText.mockResolvedValue({
          content: buildJsonResponse(slideCount),
          tokensUsed: 50,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        for (const segment of segments) {
          expect(
            segment.text,
            `segment[${segment.index}].text must be non-empty`,
          ).toBeTruthy();
          expect(
            segment.emotion,
            `segment[${segment.index}].emotion must be non-empty`,
          ).toBeTruthy();
          expect(
            segment.scene,
            `segment[${segment.index}].scene must be non-empty`,
          ).toBeTruthy();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every segment must have non-empty text, emotion, and scene — fallback path", async () => {
    // **Validates: Requirements 4.2, 4.3**
    // Ensures attribute completeness even when the fallback (splitStoryEvenly)
    // is used and placeholder values are injected by normalizeSlideCount().
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        // Force fallback by returning invalid JSON
        mockGeminiGenerateText.mockResolvedValue({
          content: "not json",
          tokensUsed: 1,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        for (const segment of segments) {
          expect(segment.text).toBeTruthy();
          expect(segment.emotion).toBeTruthy();
          expect(segment.scene).toBeTruthy();
        }
      }),
      { numRuns: 100 },
    );
  });

  // ── Index consistency ──────────────────────────────────────────────────

  it("segments must have sequential 0-based indices regardless of slideCount", async () => {
    // **Validates: Requirements 4.2**
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 20 }), async (slideCount) => {
        vi.clearAllMocks();

        mockGeminiGenerateText.mockResolvedValue({
          content: buildJsonResponse(slideCount),
          tokensUsed: 50,
        });

        const orchestrator = new AI_Orchestrator(stubSupabase);
        const segments = await orchestrator.generateSlides(
          buildStoryText(slideCount),
          slideCount,
        );

        segments.forEach((segment, i) => {
          expect(segment.index).toBe(i);
        });
      }),
      { numRuns: 100 },
    );
  });
});
