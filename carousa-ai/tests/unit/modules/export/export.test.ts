// ============================================================
// Carousa-AI — Unit Tests: Export Module
// ============================================================
// Tests for exportProjectAsZip function.
//
// Requirements: 11.1, 11.2
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Project, Slide } from "@/lib/db/types";
import { AuthorizationError } from "@/lib/utils/errors";

// ── Mock db/server (createServiceClient) ─────────────────────────────────

const mockDownload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/lib/db/server", () => ({
  createServiceClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        download: (...args: unknown[]) => mockDownload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  }),
}));

// ── Mock db/queries ───────────────────────────────────────────────────────

const mockGetProjectById = vi.fn();
const mockGetSlidesByProject = vi.fn();

vi.mock("@/lib/db/queries", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
  getSlidesByProject: (...args: unknown[]) => mockGetSlidesByProject(...args),
}));

// Import AFTER mocks are registered
import { exportProjectAsZip } from "@/modules/export";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-123",
    user_id: "user-456",
    name: "My Test Project",
    theme_id: null,
    total_slides: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSlide(index: number, hasImage = true): Slide {
  return {
    id: `slide-${index}`,
    project_id: "project-123",
    index,
    text: `Slide ${index} text`,
    emotion: null,
    scene: null,
    prompt: null,
    image_url: hasImage
      ? `https://storage.example.com/slide-images/user-456/project-123/slide-${index}.png`
      : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makePngBlob(): Blob {
  // Minimal 1x1 PNG bytes
  const pngBytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk length + type
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1 dimensions
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // bit depth, color type, etc.
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT chunk
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0xe2,
    0x21,
    0xbc,
    0x33,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e, // IEND chunk
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
  ]);
  return new Blob([pngBytes], { type: "image/png" });
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("exportProjectAsZip", () => {
  describe("ownership check", () => {
    it("melempar AuthorizationError ketika project tidak ditemukan", async () => {
      mockGetProjectById.mockResolvedValue(null);

      await expect(
        exportProjectAsZip("project-123", "user-456"),
      ).rejects.toThrow(AuthorizationError);
    });

    it("melempar AuthorizationError ketika project dimiliki user lain", async () => {
      // getProjectById dengan userId yang salah mengembalikan null (RLS)
      mockGetProjectById.mockResolvedValue(null);

      await expect(
        exportProjectAsZip("project-123", "wrong-user"),
      ).rejects.toThrow(AuthorizationError);
    });

    it("tidak melempar error ketika user adalah pemilik project", async () => {
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue([]);

      await expect(
        exportProjectAsZip("project-123", "user-456"),
      ).resolves.not.toThrow();
    });
  });

  describe("ZIP assembly — Requirements 11.1", () => {
    it("mengembalikan ZIP buffer yang valid ketika semua slide memiliki gambar", async () => {
      const slides = [makeSlide(0), makeSlide(1), makeSlide(2)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      mockDownload.mockResolvedValue({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.zipBuffer).toBeInstanceOf(Buffer);
      expect(result.zipBuffer.length).toBeGreaterThan(0);
    });

    it("mengembalikan metadata jumlah slide yang benar", async () => {
      const slides = [makeSlide(0), makeSlide(1), makeSlide(2)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      mockDownload.mockResolvedValue({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.totalSlides).toBe(3);
      expect(result.slidesWithImages).toBe(3);
      expect(result.slidesWithoutImages).toBe(0);
    });

    it("melewati slide tanpa image_url dan menghitungnya sebagai slidesWithoutImages", async () => {
      const slides = [
        makeSlide(0, true),
        makeSlide(1, false),
        makeSlide(2, true),
      ];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      mockDownload.mockResolvedValue({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.totalSlides).toBe(3);
      expect(result.slidesWithImages).toBe(2);
      expect(result.slidesWithoutImages).toBe(1);
    });

    it("mengembalikan ZIP kosong ketika tidak ada slide yang memiliki gambar", async () => {
      const slides = [makeSlide(0, false), makeSlide(1, false)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.totalSlides).toBe(2);
      expect(result.slidesWithImages).toBe(0);
      expect(result.slidesWithoutImages).toBe(2);
      expect(result.zipBuffer).toBeInstanceOf(Buffer);
    });

    it("mengembalikan totalSlides = 0 ketika project tidak memiliki slide", async () => {
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue([]);

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.totalSlides).toBe(0);
      expect(result.slidesWithImages).toBe(0);
      expect(result.slidesWithoutImages).toBe(0);
    });
  });

  describe("filename generation", () => {
    it("menghasilkan filename yang mengandung nama project dan suffix -carousel.zip", async () => {
      mockGetProjectById.mockResolvedValue(
        makeProject({ name: "My Test Project" }),
      );
      mockGetSlidesByProject.mockResolvedValue([]);

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.filename).toBe("my-test-project-carousel.zip");
    });

    it("membersihkan karakter spesial dari nama project dalam filename", async () => {
      mockGetProjectById.mockResolvedValue(
        makeProject({ name: "Proyek Keren! #1 @2024" }),
      );
      mockGetSlidesByProject.mockResolvedValue([]);

      const result = await exportProjectAsZip("project-123", "user-456");

      // Should only contain lowercase alphanumeric and hyphens
      expect(result.filename).toMatch(/^[a-z0-9-]+-carousel\.zip$/);
    });
  });

  describe("storage download error handling", () => {
    it("menghitung slide sebagai slidesWithoutImages ketika download gagal", async () => {
      const slides = [makeSlide(0), makeSlide(1)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      // First download fails, second succeeds
      mockDownload
        .mockResolvedValueOnce({ data: null, error: { message: "Not found" } })
        .mockResolvedValueOnce({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      expect(result.slidesWithImages).toBe(1);
      expect(result.slidesWithoutImages).toBe(1);
    });
  });

  describe("sequential filenames — Requirements 11.1", () => {
    it("nomor file di-pad dengan nol hingga 2 digit (slide-01, slide-02, ...)", async () => {
      // We verify this indirectly by checking the ZIP contains correctly named files
      // by loading the ZIP buffer with JSZip
      const JSZip = (await import("jszip")).default;
      const slides = [makeSlide(0), makeSlide(1), makeSlide(9)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      mockDownload.mockResolvedValue({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      const zip = await JSZip.loadAsync(result.zipBuffer);
      const fileNames = Object.keys(zip.files);

      expect(fileNames).toContain("slide-01.png");
      expect(fileNames).toContain("slide-02.png");
      expect(fileNames).toContain("slide-10.png");
    });

    it("file dalam ZIP menggunakan format PNG — Requirements 11.2", async () => {
      const JSZip = (await import("jszip")).default;
      const slides = [makeSlide(0)];
      mockGetProjectById.mockResolvedValue(makeProject());
      mockGetSlidesByProject.mockResolvedValue(slides);
      mockDownload.mockResolvedValue({ data: makePngBlob(), error: null });

      const result = await exportProjectAsZip("project-123", "user-456");

      const zip = await JSZip.loadAsync(result.zipBuffer);
      const fileNames = Object.keys(zip.files);

      // All files must have .png extension (Instagram-compatible)
      fileNames.forEach((name) => {
        expect(name).toMatch(/\.png$/);
      });
    });
  });
});
