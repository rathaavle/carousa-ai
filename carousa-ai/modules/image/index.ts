// ============================================================
// Carousa-AI: Image Module
// ============================================================
// Handles uploading slide images to Supabase Storage and
// returning public URLs.
//
// SERVER-SIDE ONLY — never import this module in client components.
// Storage bucket: slide-images
// Path pattern:   {userId}/{projectId}/{slideId}.{ext}
//
// Requirements: 7.2
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Public types ──────────────────────────────────────────────────────────

export interface UploadSlideImageParams {
  userId: string;
  projectId: string;
  slideId: string;
  imageBuffer: Buffer;
  mimeType: "image/jpeg" | "image/png";
}

export interface UploadSlideImageResult {
  /** The public URL of the uploaded image in Supabase Storage. */
  publicUrl: string;
  /** The storage path used for the upload. */
  storagePath: string;
}

// ── uploadSlideImage ──────────────────────────────────────────────────────

/**
 * Upload a slide image buffer to Supabase Storage and return the public URL.
 *
 * Storage path: `{userId}/{projectId}/{slideId}.{ext}`
 * Bucket:       `slide-images`
 *
 * Uses `upsert: true` so re-generating a slide image replaces the old one
 * at the same path without creating duplicate files.
 *
 * @param supabase  An authenticated Supabase client (server-side).
 * @param params    Upload parameters including user/project/slide IDs,
 *                  the image buffer, and its MIME type.
 * @returns         The public URL and storage path of the uploaded image.
 *
 * @throws          Error if the upload fails (message includes Supabase error).
 *
 * Requirements: 7.2
 */
export async function uploadSlideImage(
  supabase: SupabaseClient,
  params: UploadSlideImageParams,
): Promise<UploadSlideImageResult> {
  const { userId, projectId, slideId, imageBuffer, mimeType } = params;

  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  const storagePath = `${userId}/${projectId}/${slideId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("slide-images")
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Gagal mengunggah gambar slide ke storage: ${uploadError.message}`,
    );
  }

  const { data: urlData } = supabase.storage
    .from("slide-images")
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  };
}

/**
 * Delete a slide image from Supabase Storage.
 *
 * Used when a slide is deleted or its image is replaced.
 *
 * @param supabase      An authenticated Supabase client (server-side).
 * @param storagePath   The storage path of the image to delete.
 *
 * Requirements: 7.2
 */
export async function deleteSlideImage(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("slide-images")
    .remove([storagePath]);

  if (error) {
    // Non-fatal: log but don't throw — a missing image shouldn't block other ops
    console.warn(
      `[image-module] Failed to delete image at ${storagePath}: ${error.message}`,
    );
  }
}

/**
 * Derive the storage path for a slide image from its IDs.
 *
 * Useful for constructing paths without performing an upload.
 *
 * @param userId     UUID of the owning user.
 * @param projectId  UUID of the project.
 * @param slideId    UUID of the slide.
 * @param mimeType   MIME type to determine the file extension.
 * @returns          The storage path string.
 */
export function getSlideImagePath(
  userId: string,
  projectId: string,
  slideId: string,
  mimeType: "image/jpeg" | "image/png" = "image/png",
): string {
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  return `${userId}/${projectId}/${slideId}.${extension}`;
}
