// ============================================================
// Carousa-AI: Export Module
// ============================================================
// Handles exporting all slide images for a project as a ZIP file.
//
// SERVER-SIDE ONLY — never import this module in client components.
// Storage bucket: slide-images
// Path pattern:   {userId}/{projectId}/{slideId}.png
//
// Requirements: 11.1, 11.2
// ============================================================

import JSZip from "jszip";
import { createServiceClient } from "@/lib/db/server";
import { getProjectById, getSlidesByProject } from "@/lib/db/queries";
import { AuthorizationError } from "@/lib/utils/errors";

// ── Public types ──────────────────────────────────────────────────────────

export interface ExportProjectResult {
  /** The ZIP file content as a Buffer. */
  zipBuffer: Buffer;
  /** Suggested filename for the download, e.g. `my-project-carousel.zip`. */
  filename: string;
  /** Total number of slides in the project. */
  totalSlides: number;
  /** Number of slides that had an image and were included in the ZIP. */
  slidesWithImages: number;
  /** Number of slides that had no image and were skipped. */
  slidesWithoutImages: number;
}

// ── exportProjectAsZip ────────────────────────────────────────────────────

/**
 * Export all slide images for a project as a ZIP file.
 *
 * Downloads each slide image from Supabase Storage and assembles them into
 * a ZIP archive with sequentially numbered filenames (`slide-01.png`,
 * `slide-02.png`, …). Slides without an `image_url` are skipped but counted.
 *
 * The images are stored as PNG (Instagram-compatible format).
 *
 * @param projectId  UUID of the project to export.
 * @param userId     UUID of the requesting user (used for ownership check).
 * @returns          Export result containing the ZIP buffer and metadata.
 *
 * @throws {AuthorizationError}  If the project does not belong to `userId`.
 * @throws {Error}               If the project is not found or a download fails.
 *
 * Requirements: 11.1, 11.2
 */
export async function exportProjectAsZip(
  projectId: string,
  userId: string,
): Promise<ExportProjectResult> {
  const supabase = createServiceClient();

  // ── 1. Fetch project and verify ownership ─────────────────────────────
  const project = await getProjectById(supabase, projectId, userId);

  if (!project) {
    throw new AuthorizationError(
      "Proyek tidak ditemukan atau Anda tidak memiliki akses ke proyek ini.",
    );
  }

  // ── 2. Fetch all slides ordered by index ─────────────────────────────
  const slides = await getSlidesByProject(supabase, projectId);

  // ── 3. Build ZIP ──────────────────────────────────────────────────────
  const zip = new JSZip();

  let slidesWithImages = 0;
  let slidesWithoutImages = 0;

  for (const slide of slides) {
    if (!slide.image_url) {
      slidesWithoutImages++;
      continue;
    }

    // Derive the storage path from the image URL pattern:
    // {userId}/{projectId}/{slideId}.png
    const storagePath = `${userId}/${projectId}/${slide.id}.png`;

    const { data, error } = await supabase.storage
      .from("slide-images")
      .download(storagePath);

    if (error || !data) {
      // If the file is missing in storage, treat it as a slide without an image
      console.warn(
        `[export-module] Gagal mengunduh gambar untuk slide ${slide.id}: ${error?.message ?? "file tidak ditemukan"}`,
      );
      slidesWithoutImages++;
      continue;
    }

    // Convert Blob to ArrayBuffer then to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Zero-pad the slide number to 2 digits: slide-01.png, slide-02.png, …
    const slideNumber = String(slide.index + 1).padStart(2, "0");
    const filename = `slide-${slideNumber}.png`;

    zip.file(filename, imageBuffer);
    slidesWithImages++;
  }

  // ── 4. Generate ZIP buffer ────────────────────────────────────────────
  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const zipBuffer = Buffer.from(zipArrayBuffer);

  // ── 5. Build suggested filename ───────────────────────────────────────
  // Sanitise the project name for use in a filename
  const safeName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const filename = `${safeName}-carousel.zip`;

  return {
    zipBuffer,
    filename,
    totalSlides: slides.length,
    slidesWithImages,
    slidesWithoutImages,
  };
}
